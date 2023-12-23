const validator = require('validator');
const { User } = require('../../model/users');
const md5 = require('md5');

const { capitalCase } = require('change-case-all');

const sequelize = require('../../infrastructure/db/sequelize');
const initModels = require('../../model/initmodels');
const { Op } = require('sequelize');
const axios = require('axios');
const { get } = require('axios');

const models = initModels(sequelize);

const showMigrationForm = (req, res, next) => {
    let message = null;
    if (req.query.error === 'empty') {
        message = 'Username atau password tidak boleh kosong';
    } else if (req.query.error === 'identify') {
        message = 'Username atau password salah';
    }

    res.render('migration-form', { title: 'Migrasi SSO', error: message });
};

// Ajax Function to verify user and password from the old internet database

const checkUser = async (req, res, next) => {
    const { ident, password } = req.body;

    if (!validator.isNumeric(ident)) {
        return res.redirect(301, '/migration-form?error=empty');
    }

    if (validator.isEmpty(password)) {
        return res.redirect(301, '/migration-form?error=empty');
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

    res.render('verify', { title: 'Migrasi SSO', old_user: old_user, old_password: password });
};

const migrateUser = async (req, res, next) => {
    const { hid_ident, hid_password } = req.body;

    /*
    ambil input dari req.body baru 
    validasi server side
    - copy function verify yang ada di client side - di verify.hbs
        dibikin modelan kayak function show migrationForm pake if else dkk
        error nya nanti dikasih message

    - abis itu kalo kgk ke veirfy langsung di trhow ke /migration
        return res.redirect(301, '/migration-form?error=empty');
        error message nya taro di param error
    */

    const old_user = await models.users.findOne({
        where: {
            username: hid_ident,
            password: md5(hid_password),
        },
    });

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

    const authenticate = require('../../infrastructure/keycloak/keycloak.js');

    // TODO: Check data at ACADEMIA / PERSONALIA
    const kcAdminClient = await authenticate;

    // TODO: Submit data to Keycloak
    const kcGroup = await kcAdminClient.groups.find({ briefRepresentation: true, search: old_user.jurusan });

    /*
    nanti ini bagian lo nyari dkk dan bikin subgroups itu
    
    
    */
};

module.exports = {
    showMigrationForm,
    checkUser,
    migrateUser,
};
