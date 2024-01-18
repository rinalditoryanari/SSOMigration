const validator = require("validator");
const md5 = require("md5");

const { capitalCase } = require("change-case-all");

const sequelize = require("../../infrastructure/db/sequelize");
const initModels = require("../../model/initmodels");
const axios = require("axios");
const authenticate = require("../../infrastructure/keycloak/keycloak");
const { application, response } = require("express");

const models = initModels(sequelize);

const showMigrationForm = (req, res, next) => {
	let message = null;
	if (req.query.error === "empty") {
		message = "Username atau password tidak boleh kosong";
	} else if (req.query.error === "identify") {
		message = "Username atau password salah";
	}

	res.render("migration-form", { title: "Migrasi SSO", error: message });
};

// Ajax Function to verify user and password from the old internet database

const checkUser = async (req, res, next) => {
	const { ident, password } = req.body;

	if (!validator.isNumeric(ident)) {
		return res.redirect(401, "/migration-form?error=empty");
	}

	if (validator.isEmpty(password)) {
		return res.redirect(401, "/migration-form?error=empty");
	}

	//Check for existing user and password in the old internet database
	const old_user = await models.users.findOne({
		where: {
			username: ident,
			password: md5(password),
		},
	});

	if (old_user === null) {
		return res.redirect(301, "/migration-form?error=identify");
	}

	old_user.nama = capitalCase(old_user.nama);

	res.render("verify", {
		title: "Migrasi SSO",
		old_user: old_user,
		old_password: password,
	});
};

const migrateUser = async (req, res, next) => {
	const { email, password, hid_ident, hid_password } = req.body;

	let regex = /\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)?pnj\.ac\.id\b/;
	if (!regex.test(email)) {
		return res.redirect(
			401,
			"/migration-form?error=Pastikan mengisi Email dengan benar!"
		);
	}

	regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{10,}$/;
	if (!regex.test(password)) {
		return res.redirect(
			401,
			"/migration-form?error=Pastikan mengisi Password dengan benar!"
		);
	}

	const old_user = await models.users.findOne({
		where: {
			username: hid_ident,
			password: md5(hid_password),
		},
	});

	old_user.jabatan = "Dosen";
	// TODO: Check data at ACADEMIA / PERSONALIA
	const kcAdminClient = await authenticate;

	old_user.jabatan == "Dosen";

	// Find The Keycloak Groups
	let kcGroupJabatan = await kcAdminClient.groups.find({
		briefRepresentation: true,
		search: old_user.jabatan,
	});
	kcGroupJabatan = kcGroupJabatan.find((group) => group.name == "Dosen");
	kcGroupJabatan = await kcAdminClient.groups.findOne({
		briefRepresentation: true,
		id: kcGroupJabatan.id,
	});

	// Split name to firstName and lastName
	const nameParts = old_user.nama.split(" ");
	const firstName = nameParts[0];
	const lastName = nameParts.slice(1).join(" ");

	if (old_user.jabatan == "Mahasiswa") {
		/* array find group mahasiswa -> subgroup jurusan
        * findOne pakai subgroup.id
        *   await kcAdminClient.groups.findOne({briefRepresentation: true, id: kcSubGroup.id})
        * cari tahun akademik pakai api get
        *   https://apitracer.upatik.io/mhs_tahun_akademik?nim=
        * array find subgroup jurusan ->  angkatan
        *
        * kalau tidak ada
        *   bikin object group
        *   {
            name: angkatan,
            path: group jurusan.path / angkatam,
            }
        *
        *   create group
        *       pakai kcAdminClient.groups.setOrCreateChild({id: group jurusan.id}, object group);
        *
        * bikin object user
        *   {
                username: old_user.username,
                email: email,
                emailVerified: true,
                enabled: true,
                firstName: firstName,
                lastName: lastName,
            }
        *create user ->  await kcAdminClient.users.create(user)
        *add user to group -> await kcAdminClient.users.addToGroup({id: user.id, groupId: group Id})*/
	} else if (old_user.jabatan == "Dosen") {
		let kcSubGroup = kcGroupJabatan.subGroups.find(
			(subgroup) => subgroup.name == "Teknik Informatika dan Komputer"
		);

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
			groupId: kcGroupJabatan.id,
		});

		res.json(status);
		/*array find group group -> subgroup jurusan
        * findOne pakai subgroup.id
        *   await kcAdminClient.groups.findOne({briefRepresentation: true, id: kcSubGroup.id})

        * bikin object user
        *   {
                username: old_user.username,
                email: email,
                emailVerified: true,
                enabled: true,
                firstName: firstName,
                lastName: lastName,
            }
        *create user ->  await kcAdminClient.users.create(user)
        *add user to group -> await kcAdminClient.users.addToGroup({id: user.id, groupId: group Id}) */
	} else {
		//Cari grup 'Staf'
		//staf
		/* array find group staff -> subgroup jurusan -> cari "Data Migrasi"
        * findOne pakai subgroup.id
        *   await kcAdminClient.groups.findOne({briefRepresentation: true, id: kcSubGroup.id})

        * bikin object user
        *   {
                username: old_user.username,
                email: email,
                emailVerified: true,
                enabled: true,
                firstName: firstName,
                lastName: lastName,
            }
        *create user ->  await kcAdminClient.users.create(user)
        *add user to group -> await kcAdminClient.users.addToGroup({id: user.id, groupId: kcGroupId})*/
	}
};

// sampai sini aja dulu

module.exports = {
	showMigrationForm,
	checkUser,
	migrateUser,
};
