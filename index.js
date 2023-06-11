const express = require('express');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

// Middleware
app.use(express.json());
app.use(cors());

// Verify JWT
const verifyJwt =  (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }
  const token = authorization.split(' ')[1];

  // berar token;
  jwt.verify(token, process.env.ACCESS_Token, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    req.decoded = decoded;
    next();
  })

}



// MongoDb Collection Settings
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nyrtlyj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("RoyAcademy").collection("users");
   
    // User JWT APIs
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_WEB_TOKEN, { expiresIn: '1h' });
      res.send({token});
    })



    // Users related Apis
    app.get('/users', async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req, res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      console.log('existing user', existingUser);

      if(existingUser){
        return res.send({message: 'User already exists'})

      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users-makeAdmin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const updateDoc = {
        $set:{
          role: "admin",
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    app.patch("/users-makeInstructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const updateDoc = {
        $set:{
          role: "instructor",
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.delete("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await usersCollection.deleteOne(query)
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('Server is running');
})
app.listen(port, ()=>{
    console.log(`Server always listening on ${port}`);
})
