const validator = require("validator");
const { User } = require("../../model/users");
const md5 = require('md5');

const {capitalCase} = require('change-case-all');

const sequelize = require('../../infrastructure/db/sequelize');
const initModels = require('../../model/initmodels')
const { Op } = require("sequelize");
const axios = require("axios");
const {get} = require("axios");

const models = initModels(sequelize);

const showMigrationForm = (req,res,next) => {
    let message = null;
    if(req.query.error === 'empty') {
        message = 'Username atau password tidak boleh kosong';
    } else if(req.query.error === 'identify') {
        message = 'Username atau password salah';
    }

    res.render('migration-form', { title: 'Migrasi SSO', error: message });
}

// Ajax Function to dynamically verify password
const verifyPassword = async (req, res, next) => {
    const { password } = req.body;

    if(validator.isEmpty(password)) {
        return res.json({ status: 'error', message: 'Password tidak boleh kosong' });
    }

    if(!validator.isStrongPassword(password, {
        minLength: 10,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
    })) {
        return res.json({ status: 'error', message: 'Password harus memiliki kriteria: min 10 karakter, 1 huruf besar, 1 huruf kecil, dan 1 simbol/angka' });
    }

    res.json({ status: 'success', message: 'Password valid' });
}

// Ajax Function to verify user and password from the old internet database

const checkUser = async (req, res, next) => {
    const { ident, password } = req.body;

    if(!validator.isNumeric(ident)){
        return res.redirect(301, '/migration-form?error=empty');
    }

    if(validator.isEmpty(password)) {
        return res.redirect(301, '/migration-form?error=empty');
    }

    //Check for existing user and password in the old internet database
    const old_user = await models.users.findOne({
        where: {
            username: ident,
            password: md5(password)
        }
    });

    if (old_user === null) {
        return res.redirect(301, '/migration-form?error=identify');
    }

    old_user.nama = capitalCase(old_user.nama);

    res.render('verify', { title: 'Migrasi SSO', old_user: old_user, old_password: password});
}

const migrateUser = async (req, res, next) => {
    const { hid_ident, hid_password } = req.body;

    const old_user = await models.users.findOne({
        where: {
            username: hid_ident,
            password: md5(hid_password)
        }
    });

    const authenticate = require('../../infrastructure/keycloak/keycloak.js')

    // TODO: Check data at ACADEMIA / PERSONALIA
    const kcAdminClient = await authenticate;

    // TODO: Submit data to Keycloak
    const kcGroup = await kcAdminClient.groups.find({briefRepresentation: true, search: old_user.jurusan});
}

module.exports = {
    showMigrationForm,
    checkUser,
    migrateUser
}