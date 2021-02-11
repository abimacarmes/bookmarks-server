require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const winston = require('winston')
const {NODE_ENV} = require('./config')
const {v4: uuid} = require('uuid');

const STORE = require('./store')

const app = express()

app.use(express.json());

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({filename:'info.log'})
    ]
});

if(NODE_ENV !== 'production'){
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }))
}

app.use(function errorHandler(error, req, res, next){
    let response
    if(NODE_ENV ==='production'){
        response = {error: {message:'server error'}}
    }
    else{
        console.error(error)
        response = {message: error.message,error}
    }
    res.status(500).json(response)
})

app.use(function validateBearerToken(req,res,next){
    const apiToken=process.env.API_TOKEN
    const authToken = req.get('Authorization').split(" ")[1]

    if(!authToken || authToken !== apiToken){
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({error: 'Unauthorized request'})
    }

    next()
})

app.get('/bookmarks', (req,res) => {
    res.json(STORE.bookmarks)
})

app.get('/bookmarks/:id', (req,res) => {
    const {id} = req.params;
    const bookmark = STORE.bookmarks.find(b => b.id == id);

    if(!bookmark){
        logger.error(`Bookmark with id ${id} not found.`);
        return res
            .status(404)
            .send('Bookmark Not Found');
    }

    res.json(bookmark)
})

app.post('/bookmarks', (req, res) => {
    const { title, description, rating } = req.body;

    if(!title){
        logger.error(`Title is required.`);
        return res.status(400).send('Invalid data');
    }
    if(!description){
        logger.error(`Description is required.`);
        return res.status(400).send('Invalid data');
    }
    if(!rating){
        logger.error(`Rating is required.`);
        return res.status(400).send('Invalid data');
    }

    const id = uuid();

    const bookmark = {
        id,title,description,rating
    }

    STORE.bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${id} created.`);

    res
        .status(201)
        .location(`http://localhost:8000/bookmarks/${id}`)
        .json(bookmark);
})

app.delete('/bookmarks/:id',(req,res) => {
    const {id} = req.params;

    const bookmarkIndex = STORE.bookmarks.findIndex(bkmk => bkmk.id == id)

    if(bookmarkIndex === -1){
        logger.error(`Bookmark with id ${id} not found.`);
        return res
            .status(404)
            .send('Not Found');
    }

    STORE.bookmarks.splice(bookmarkIndex,1);

    logger.info(`Bookmark with id ${id} deleted.`);
    res
        .status(204)
        .end();
})


app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())

module.exports = app
