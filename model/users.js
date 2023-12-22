module.exports = (sequelize, DataTypes) => {
    return sequelize.define('v_username_password_wt_jurusan', {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        jabatan: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        jurusan: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        expire_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        nama: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email_pnj: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        hp: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    }, {
        // You can define additional attributes here
        tableName: 'v_username_password_wt_jurusan',
        createdAt: false,
        updatedAt: false,
        timestamps: false,

    })
}