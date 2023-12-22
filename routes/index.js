const express = require('express');
const router = express.Router();
const migration = require('../controllers/migration/migration');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/sso', function(req, res, next) {
  res.render('sso', { title: 'Migrasi SSO' });
});


router.get('/migration', migration.showMigrationForm);
router.post('/migration', migration.checkUser);
router.post('/migration/migrate', migration.migrateUser);

module.exports = router;
