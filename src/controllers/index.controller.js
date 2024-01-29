const { Pool } = require('pg');

const compareDataTypes = require('../utils/table');
let pool;

const dataType = {
    "character": "Text",
    "character varying": "Text",
    "text": "Text",
    "bigint": "Integer",
    "smallint": "Integer",
    "integer": "Integer",
    "numeric": "Decimal",
    "double precision": "Decimal",
    "bit": "Boolean",
    "bit varying": "Boolean",
    "boolean": "Boolean",
    "date": "Date",
    "timestamp without time zone": "TimeStamp",
    "timestamp with time zone": "TimeStamp"
}

const setDBInfo = async (req, res) => {
    const {host, username, password, port, db} = req.body;
    const connectionString = `postgres://${username}:${password}@${host}:${port}/${db}`
    pool = new Pool({connectionString, ssl: true});

    pool.connect((err, client, release) => {
        if(err) {
            console.log('Error establishing pool connection:', err);
            res.status(400).json({success: false});
        } else {
            console.log('Pool connection established successfully');
            res.status(200).json({success: true});
            release();
        }
    })
}

async function hasPrimaryKey(tableName) {
    try {
        const client = await pool.connect(); // Get a client from the pool
    
        // Query to check if the table has a primary key
        const query = `SELECT column_name
                        FROM information_schema.key_column_usage
                        WHERE table_schema = 'public' 
                        AND table_name = $1`;
    
        const result = await client.query(query, [tableName]);
        const hasPrimaryKey = result.rowCount > 0; // Check if any rows are returned
        client.release(); // Release the client back to the pool

        return hasPrimaryKey;
    } catch (error) {
        console.error('Error checking primary key:', error);
        throw error;
    }
}



async function getTableFields(table_name) {
    try {
        const client = await pool.connect(); // Get a client from the pool

        // Query to retrieve column names and data types
        const query = `SELECT column_name, data_type
                        FROM information_schema.columns 
                        WHERE table_name = $1`;

        const result = await client.query(query, [table_name]);
        // Query to retrieve key columns
        const keyQuery = `SELECT column_name 
                        FROM information_schema.key_column_usage 
                        WHERE table_name = $1 
                        AND table_schema = 'public'`;

        const keyResult = await client.query(keyQuery, [table_name]);
        const keyColumns = keyResult.rows.map(row => row.column_name);
        
 


        // Extract column names and data types from the result
        // console.log(result);
        const fields = result.rows.map((row,index) => ({
            name: row.column_name,
            type: dataType[row.data_type],
            isKey: keyColumns.includes(row.column_name)
        }));

        client.release(); // Release the client back to the pool
        const sortedFields = fields.sort(compareDataTypes);
        return sortedFields;
    } catch (error) {
        console.error('Error getting table fields:', error);
        throw error;
    }
}

const getTables = async (req,res)=>{
    try
    {
        const client = await pool.connect();
        const response = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
        client.release(); 
        const returnData = await Promise.all(response.rows.map(async (item) => {
            const hasKey = await hasPrimaryKey(item.table_name);
            const columns = await getTableFields(item.table_name);
            const isView = `SELECT * FROM information_schema.views WHERE table_name = $1`
            const ViewResult = await client.query(isView, [item.table_name]);
            //     table_type: {isView: ViewResult.rowCount>0? '1':'0', viewCommand: ViewResult.rowCount>0? ViewResult.rows[0].view_definition:''}});
            return { name: item.table_name, isChecked: false, hasKey, columns,
                table_type: {isView: ViewResult.rowCount>0? '1':'0', viewCommand: ViewResult.rowCount>0? ViewResult.rows[0].view_definition:''}} ;
          }));      
        res.status(200).json(returnData);
    }
    catch(error){
        console.log(error);
        res.send("Error: "+error);
    }
};

const getForeignTables = async (req,res)=>{
    try
    {
        const client = await pool.connect();
        const response = await client.query(`SELECT
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            pg_catalog.pg_get_constraintdef(r.oid, true) AS constraint_definition
            FROM
                pg_catalog.pg_constraint r
            WHERE
                r.contype = 'f'::char;
        `);
        client.release(); 
        res.status(200).json(response);
    }
    catch(error){
        console.log(error);
        res.send("Error: "+error);
    }
};



const getUserById = async (req,res) => {
    const id = req.params.id;
    const response = await pool.query('SELECT * FROM account_mapping WHERE id LIEK $1',[id]);
    res.json(response.rows);
};

const runQuery = async (req, res) => {
    const {query} = req.body;
     console.log(query);
    try{
        const client = await pool.connect();
        const response = await client.query(query);
        res.status(200).json(response);    
    }
    catch(error){
        res.status(400).json({error: error});
    }
}
const testQuery = async (req, res) => {
    const {query} = req.body;
    console.log(query);
    try{
        const client = await pool.connect();
        const response = await client.query(query);
        res.status(200).json({res:"Query Syntax is good"});    
    }
    catch(error){
        res.status(200).json({res:"Invalid Query Syntax "});
    }
}


module.exports = {
    setDBInfo,
    getTables,
    getUserById,
    runQuery,
    getForeignTables,
    testQuery
}