const validator = require('validator');
const {User} = require('../../model/users');
const md5 = require('md5');

const {capitalCase} = require('change-case-all');

const sequelize = require('../../infrastructure/db/sequelize');
const initModels = require('../../model/initmodels');
const {Op} = require('sequelize');
const axios = require('axios');
const {get} = require('axios');
const authenticate = require("../../infrastructure/keycloak/keycloak");

const models = initModels(sequelize);

const showMigrationForm = (req, res, next) => {
    let message = null;
    if (req.query.error === 'empty') {
        message = 'Username atau password tidak boleh kosong';
    } else if (req.query.error === 'identify') {
        message = 'Username atau password salah';
    }

    res.render('migration-form', {title: 'Migrasi SSO', error: message});
};

// Ajax Function to verify user and password from the old internet database

const checkUser = async (req, res, next) => {
    const {ident, password} = req.body;

    if (!validator.isNumeric(ident)) {
        return res.redirect(401, '/migration-form?error=empty');
    }

    if (validator.isEmpty(password)) {
        return res.redirect(401, '/migration-form?error=empty');
    }

    //Check for existing user and password in the old internet database
    const old_user = await models.users.findOne({
        where: {
            username: ident,
            password: md5(password),
        },
    });

    if (old_user === null) {
        return res.redirect(401, '/migration-form?error=identify');
    }

    old_user.nama = capitalCase(old_user.nama);

    res.render('verify', {title: 'Migrasi SSO', old_user: old_user, old_password: password});
};

const tahunAkademik = async (username) => {
    var requestOptions = {
        method: 'GET',
    };
    const params = new URLSearchParams({
        nim: username,
    })
    try {
        const response = await fetch(`https://apitracer.upatik.io/mhs_tahun_akademik?` + params, requestOptions);
        let result = await response.text();  // Assuming it's JSON
        result = JSON.parse(result)
        return result.th_akademik
    } catch (error) {
        console.error('Error:', error);
        throw error;  // Propagate the error
    }
}

const getSubGroup = async (kcGroup, search) => {
    var kcSubGroup = kcGroup.subGroups.find((group) => {
        return group.name == search
    })

    if (kcSubGroup) {
        return kcSubGroup
    } else {
        kcSubGroup = {
            name: search,
            path: kcGroup.path + `/${search}`,
        }
        // kalo gak ada jurusannya

        // TODO: Check data at ACADEMIA / PERSONALIA
        const kcAdminClient = await authenticate;

        kcSubGroup = await kcAdminClient.groups.setOrCreateChild({id: kcGroup.id}, kcSubGroup);
        return kcSubGroup;
    }
}

const postUser = async (old_user, email, password, kcGroupId) => {
    // Split the name into parts
    const parts = old_user.nama.split(' ');

    // Extract first name and last name
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    let user = {
        username: old_user.username,
        email: email,
        // password: password,
        emailVerified: true,
        enabled: true,
        firstName: firstName,
        lastName: lastName,
    }
    // try {
    // TODO: Check data at ACADEMIA / PERSONALIA
    const kcAdminClient = await authenticate;

    user = await kcAdminClient.users.create(user)
    console.log(user, user.id, user["id"])
    user = user.id
    const group = await kcAdminClient.users.addToGroup()

    return group;
    // } catch (e) {
    //     console.log('error', e)
    // }


}

const migrateUser = async (req, res, next) => {
    const {email, password, hid_ident, hid_password} = req.body;

    let regex = /\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)?pnj\.ac\.id\b/;
    if (!regex.test(email)) {
        return res.redirect(401, '/migration-form?error=Pastikan mengisi Email dengan benar!');
    }

    regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{10,}$/;
    if (!regex.test(password)) {
        return res.redirect(401, '/migration-form?error=Pastikan mengisi Password dengan benar!');
    }

    const old_user = await models.users.findOne({
        where: {
            username: hid_ident,
            password: md5(hid_password),
        },
    });

    // TODO: Check data at ACADEMIA / PERSONALIA
    const kcAdminClient = await authenticate;

    // Find The Keycloak Groups
    const kcGroupJabatan = await kcAdminClient.groups.find({briefRepresentation: true, search: old_user.jabatan});
    let kcGroupId;

    if (old_user.jabatan == 'Mahasiswa') {
        let kcGroupJurusan = await getSubGroup(kcGroupJabatan[0], old_user.jurusan)

        kcGroupJurusan = await kcAdminClient.groups.findOne({briefRepresentation: true, id: kcGroupJurusan.id});
        const tahun_akademik = await tahunAkademik(old_user.username);
        const kcGroupAngkatan = await getSubGroup(kcGroupJurusan, tahun_akademik)

        kcGroupId = kcGroupAngkatan.id
    } else if (old_user.jabatan == 'dosen') {
        //dosen
    }
    {
        //staf
    }

    const post = await postUser(old_user, email, password, kcGroupId)
    /*
        ambil nama sama jurusan, nip/nim dari old
            sisanya dari form input
        naamnya pake CapitalCase()
        
        Kalo dia mahasiswa -> 
            harus ngambil 
                tahun akademik dari api gateaway -> https://apitracer.upatik.io/mhs_tahun_akademik?nim=1907412028
                {
                    ...
                    "th_akademik": 2019
                }
                nanti dia masuk ke /mahasiswa/'jurusan'/'th_akademik'

        kalo dosen cuman ambil jurusan doang
                nanti ke /dosen/jurusan

        kalo staff langsung ke staf/data migrasi
    */


    // TODO: Submit data to Keycloak
    console.log(kcGroupJabatan[0], kcGroupJabatan)
    /*
    nanti ini bagian lo nyari dkk dan bikin subgroups itu
    
    
    */
};

module.exports = {
    showMigrationForm,
    checkUser,
    migrateUser,
};
