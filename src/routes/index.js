const { Router} =  require('express');
const router = Router();

const { getTables, getUserById, setDBInfo, runQuery, getForeignTables, testQuery} = require('../controllers/index.controller');

router.get('/users/:id',getUserById);
router.post('/database', setDBInfo);
router.get('/tables',getTables);
router.get('/foreigntables',getForeignTables);
router.post('/query', runQuery);
router.post('/testquery', testQuery);

router.get('/test', (req, res) => {
  res.status(200).json('Welcome, your app is working well');
})

module.exports = router;