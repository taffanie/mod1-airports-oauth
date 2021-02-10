const express = require("express");
const app = express();
const session = require('express-session');

// OAuth
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');

// require('dotenv').config('.env');
app.use(cors());

// Mongo 
const mongoose = require('mongoose');
const createUserController = require('./users/controllers/createUser')
const readUserController = require('./users/controllers/readUser')
const loginController = require('./users/controllers/login')
const logoutController = require('./users/controllers/logout')

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const fs = require('fs');

// our airports json
const airports = require("./airports.json");
const Airport = require("./Airport.js");

// swagger components
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// swagger config
const swaggerOptions = require("./openapi");

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerJsdoc(swaggerOptions), { explorer: true })
);

// connect to mongo
mongoose.connect(
  "mongodb://localhost/airportUsers",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  () => {
    console.log("Connected to MongoDB");
  }
);

// create middleware for checking the JWT
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://mod1-day8.eu.auth0.com/.well-known/jwks.json'
    // jwksUri: `https://${process.env.AUTH0_DOMAIN}.well-known/jwks.json`
  }),
  audience: 'https://airports',
  issuer: 'https://mod1-day8.eu.auth0.com/',
  // audience: process.env.AUTH0_AUDIENCE,
  // issuer: `https://${process.env.AUTH0_DOMAIN}`,
  algorithms: ['RS256']
});

/**
 * @swagger
 * tags:
 *   name: Airports
 *   description: Airport management
 *
 */

/**
 * @swagger
 * /airports:
 *    get:
 *     summary: Reads
 *     description: returns an array of airports
 *      ![airport](https://twistedsifter.com/wp-content/uploads/2014/11/mexico-city-international-airport-drone-video.jpg)
 *     responses:
 *       200:
 *         description: status ok - returns all the airports
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Airport'
 *       302:
 *          description: moved temporarily
 *       404:
 *          description: not found
 *       500: 
 *          description: internal server error 
 *    post: 
 *     summary: Creates
 *     description:  Adds latest airport to the existing list of airports
 *     requestBody:
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           $ref: '#/components/schemas/Airport'
 *     responses:
 *      200: 
 *        description: status ok - airport was added 
 *      302: 
 *        description: moved temporary
 *      404:
 *        description: not found
 *      500:
 *        description: internal server error  
 * /airports/{icao}:
 *    get:
 *     summary: Reads one airport
 *     description: Returns one specific airport
 *     parameters:
 *     - in: path
 *       required: true
 *       name: icao
 *       description: Unique airport ID
 *       schema:
 *         properties:
 *           icao:
 *             type: string
 *     responses:
 *       200:
 *         description: status ok - returns one JSON object that represent that airport
 *         content: 
 *           application/json:
 *             schema:
 *               $ref: '#components/schemas/Airport'
 *       302:
 *         description: moved temporarily
 *       404:
 *         description: not found
 *       500: 
 *         description: internal server error 
 *    put: 
 *      summary: Updates
 *      description: Updates an airport in the existing list of airports
 *      parameters:
 *      - in: path
 *        required: true 
 *        name: icao
 *        description: Unique airport ID
 *        schema: 
 *          properties:
 *            icao:
 *              type: string 
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Airport'
 *      responses:
 *        200:
 *          description: status ok - airport was updated
 *        302:
 *          description: moved temporarily
 *        404:
 *          description: not found
 *        500:
 *          description: internal server error
 *    delete:
 *      summary: Deletes
 *      description: Deletes an airport from the existing list of airports
 *      parameters:
 *      - in: path
 *        required: true 
 *        name: icao
 *        description: Unique airport ID
 *        schema:
 *          required: 
 *          - icao 
 *          properties:
 *            icao:
 *              type: string
 *      responses:
 *        200:
 *          description: status ok - airport was deleted
 *        302:
 *          description: moved temporarily
 *        404:
 *          description: not found
 *        500:
 *          description: internal server error
 */

// Unless you fs.writeFile, will only save in-memory, not permanently in json file 
// in-memory will reset all airports to default after restart of app 

// --------------- AIRPORT ROUTES ---------------

// Get all airports 
app.get("/airports", checkJwt, (req, res) => {
  res.status(200).send(airports)
})

// Get all airports paginated 
app.get("/airports/pages", checkJwt, (req, res) => {
  let pageSize = 25
  if (req.query.pageSize) {
    pageSize = req.query.pageSize
  }
  let currentPage = req.query.page
  let index = (currentPage - 1) * pageSize
  const paginatedAirports = airports.slice(index, pageSize * currentPage)
  res.status(200).send(paginatedAirports);
});

// ?page=1&pageSize=25

// Get one airport
app.get("/airports/:icao", checkJwt, (req, res) => {
  const airport = airports.find(airport => airport.icao === req.params.icao)
  res.status(200).send(airport)
})

// Create airport
app.post("/airports", checkJwt, (req, res) => {
  const newAirport = req.body
  airports.push(newAirport)
  res.status(201).send(newAirport)
  fs.writeFile('./airports.json', JSON.stringify(airports, null, '\t'), (err) => {
    if (err) throw err;
    console.log('Airport created!')
  })
})

// Update airport
app.put("/airports/:icao", checkJwt, (req, res) => {
  const airportIndex = airports.findIndex(airport => airport.icao === req.params.icao)
  airports.splice(airportIndex, 1, req.body)
  res.status(200).send(req.body)
  fs.writeFile('./airports.json', JSON.stringify(airports, null, '\t'), (err) => {
    if (err) throw err;
    // console.log('Airport updated!')
  })
})

// Delete airport 
app.delete("/airports/:icao", checkJwt, (req, res) => {
  const airportIndex = airports.findIndex(airport => airport.icao === req.params.icao)
  const deleteAirport = airports.find(airport => airport.icao === req.params.icao)
  airports.splice(airportIndex, 1)
  res.status(204).send(deleteAirport)
  fs.writeFile('./airports.json', JSON.stringify(airports, null, '\t'), (err) => {
    if (err) throw err;
    // console.log('Airport deleted!')
  })
})

// --------------- USER ROUTES ---------------

// LOGIN 
app.post("/login", loginController)

// LOGOUT
app.get("/logout", logoutController)

// CREATE USER
app.post("/users", createUserController)

// READ USER
app.get("/users/:id", readUserController)

module.exports = app;