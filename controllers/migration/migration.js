const validator = require('validator');
const md5 = require('md5');

const {capitalCase} = require('change-case-all');

const sequelize = require('../../infrastructure/db/sequelize');
const initModels = require('../../model/initmodels');
const axios = require('axios');
const authenticate = require('../../infrastructure/keycloak/keycloak');

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
        return res.redirect(301, '/migration-form?error=identify');
    }

    old_user.nama = capitalCase(old_user.nama);

    res.render('verify', {title: 'Migrasi SSO', old_user: old_user, old_password: password});
};

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
    let kcGroupJabatan = await kcAdminClient.groups.find({
        briefRepresentation: true,
        search: old_user.jabatan,
    });
    kcGroupJabatan = kcGroupJabatan.find((group) => group.name == old_user.jabatan);
    kcGroupJabatan = await kcAdminClient.groups.findOne({
        briefRepresentation: true,
        id: kcGroupJabatan.id,
    });

    // Split name to firstName and lastName
    const nameParts = old_user.nama.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    let kcSubGroup;

    if (old_user.jabatan === 'Mahasiswa') {
        // ambil subgroup jurusan
        let kcGroupJurusan = kcGroupJabatan.subGroups.find((jurusan) => jurusan.name === old_user.jurusan);
        kcGroupJurusan = await kcAdminClient.groups.findOne({
            id: kcGroupJurusan.id,
        });

        // GET informasi mahasiswa from apitracer
        const apiMahasiswaURL = 'https://apitracer.upatik.io/mhs_tahun_akademik';
        const responseMahasiswa = await axios.get(apiMahasiswaURL, {
            params: {
                nim: old_user.username,
            },
        });

        // ambil tahun angkatan
        let kcGroupAngkatan = responseMahasiswa.data['th_akademik'];
        kcGroupAngkatan = kcGroupJurusan.subGroups.find((angkatan) => angkatan.name === kcGroupAngkatan);

        // check angkatan group if existed
        if (kcGroupAngkatan == null) {
            //  create new angkatan group
            kcGroupAngkatan = await kcAdminClient.groups.setOrCreateChild(
                {
                    id: kcGroupJurusan.id,
                },
                {
                    name: kcGroupAngkatan,
                    path: kcGroupJurusan.path + '/' + kcGroupAngkatan,
                }
            );
        }

        kcSubGroup = kcGroupAngkatan;
    } else if (old_user.jabatan === 'Dosen') {
        //dosen
        kcSubGroup = kcGroupJabatan.subGroups.find((subgroup) => subgroup.name === old_user.jurusan);
    } else {
        //staff
        kcSubGroup = kcGroupJabatan.subGroups.find((subgroup) => subgroup.name === 'Data Migrasi');
    }
    //Buat user baru
    const kcUser = await kcAdminClient.users.create({
        username: old_user.username,
        email: email,
        firstName: firstName,
        lastName: lastName,
        emailVerified: true,
        enabled: true,
    });

    // Tambahkan anggota ke grup
    const status = await kcAdminClient.users.addToGroup({
        id: kcUser.id,
        groupId: kcSubGroup.id,
    });

    res.json(status);
};

// sampai sini aja dulu

module.exports = {
    showMigrationForm,
    checkUser,
    migrateUser,
};
