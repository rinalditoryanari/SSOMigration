async function authenticate() {

    const KcAdminClient = await import('@keycloak/keycloak-admin-client').then(m => m.default)

    // keycloak.js
    const kcAdminClient = new KcAdminClient({
        baseUrl: process.env.KEYCLOAK_BASE_URL,
        realmName: process.env.KEYCLOAK_REALM_NAME,
    });

    await kcAdminClient.auth({
        username: process.env.KEYCLOAK_ADMIN_USERNAME,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    });

    return kcAdminClient;
}

module.exports = authenticate();
