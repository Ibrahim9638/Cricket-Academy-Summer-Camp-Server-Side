const express = require('express');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');

const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
// Middleware
app.use(express.json());
app.use(cors());

// Verify JWT
const verifyJwt =  (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access 1'})
  }
  const token = authorization.split(' ')[1];

  // berar token;
  jwt.verify(token, process.env.ACCESS_WEB_TOKEN, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access 2'});
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
    const instructorCollection = client.db("RoyAcademy").collection("instructor");
    const classesCollection = client.db("RoyAcademy").collection("classes");
   const  selectClassCollection = client.db("RoyAcademy").collection("selectClass");
   const paymentCollection = client.db("RoyAcademy").collection("payment");
    // User JWT APIs
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_WEB_TOKEN, { expiresIn: '1h' });
      res.send({token});
    })

    // verify admin 
    // this admin verify work after verify jwt 
   const verifyAdmin =async (req, res, next)=>{
    const decodedEmail = req.decoded.email 
    const query = {email: decodedEmail}
    const user =await usersCollection.findOne(query)
    if(user?.role !== "admin"){
      return res.status(403).send({error:true, message:"UnAuthorized Access denied 3"})
    }
    next();
   }
    // check user isAdmin
    app.get("/users/admin/:email", verifyJwt, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      const decodedEmail = req.decoded.email;
      console.log({email, decodedEmail})
      if (email !== decodedEmail) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = { admin: user?.role === "admin" };
      res.send(isAdmin);
    });

        // this instructor verify work after verify jwt 
   const verifyInstructor =async (req, res, next)=>{
    const decodedEmail = req.decoded.email 
    const query = {email: decodedEmail}
    const user =await usersCollection.findOne(query)
    if(user?.role !== "instructor"){
      return res.status(403).send({error:true, message:"UnAuthorized Access denied 3"})
    }
    next();
   }
        // check user isInstructor
        app.get("/users/instructor/:email", verifyJwt, verifyInstructor, async (req, res) => {
          const email = req.params.email;
    
          const decodedEmail = req.decoded.email;
          console.log({email, decodedEmail})
          if (email !== decodedEmail) {
            return res.send({ admin: false });
          }
          const query = { email: email };
          const user = await usersCollection.findOne(query);
          const isAdmin = { admin: user?.role === "instructor" };
          res.send(isAdmin);
        });
    

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

    //Instructor API
    app.get('/instructor', async(req,res)=>{
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })

    app.post('/add-class', async(req, res)=>{
      const user = req.body;
      const result = await classesCollection.insertOne(user);
      res.send(result);
    });

    app.get("/class/instructor/:email", async(req, res)=>{
      const email = req.params.email
      const query = {InstructorEmail: email}
      const classByInstructor = await classesCollection.find(query).toArray();
      res.send(classByInstructor)
    })

    // admin apis
    app.get("/all-classes", async(req, res)=>{
      const result = await classesCollection.find().toArray()
      res.send(result)
    })

    // manage clases 
    app.patch("/approve-class/:id", async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const {status} = req.body 
      const updateDoc = {
        $set:{
          status 
        }
      }
      const updateStatus = await classesCollection.updateOne(query, updateDoc)
      res.send(updateStatus)
    })
    // denied  classes status 
    app.patch("/denied-class/:id", async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const {status} = req.body
      const updateDoc = {
        $set:{
          status 
        }
      }
      const updateStatus = await classesCollection.updateOne(query, updateDoc)
      res.send(updateStatus)
    })
    app.patch("/feedback-class/:id", async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const {feedback} = req.body
      const updateDoc = {
        $set:{
          feedback: feedback,
        }
      }
      const updateStatus = await classesCollection.updateOne(query, updateDoc)
      res.send(updateStatus)
    })

    // Approved class 
    app.get("/approved-classes", async(req, res)=>{
      const query = {status : 'approved'}
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })

    //select class 
    app.get('/select-classes/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {userEmail: email}
      const result= await selectClassCollection.find(query).toArray();
      res.send(result);
    })
    
    app.post("/select-classes", verifyJwt, async(req, res)=>{
      const selectClassInfo = req.body
      const setSelectClass = await selectClassCollection.insertOne(selectClassInfo)
      res.send(setSelectClass)
    })

    app.get("/classbyIntructor/:email",verifyJwt, async(req, res)=>{
      const email = req.params.email
      const query = {userEmail: email}
      const result = await selectClassCollection.find(query).toArray()
      res.send(result) 
    })
     // student get all enrolled classes
     app.get("/enrolled-classes/:email",  async (req, res) => {
      const email = req.params.email;

      // Find the enrolled classes for the student in the payment collection
      const paymentQuery = { email: email };
      const enrolledClasses = await paymentCollection
        .find(paymentQuery)
        .toArray();

      // Extract the class IDs from the enrolled classes
      let classIds = [];
      enrolledClasses.forEach((payment) => {
        classIds = classIds.concat(payment.classIds.flat());
      });

      // Find the corresponding classes in the class collection
      const classQuery = {
        _id: { $in: classIds.map((id) => new ObjectId(id)) },
      };
      const enrolledClassDetails = await classesCollection
        .find(classQuery)
        .toArray();

      // Combine class details with payment date
      const enrichedEnrolledClasses = enrolledClassDetails.map(
        (classDetail) => {
          const payment = enrolledClasses.find((payment) =>
            payment.classIds.flat().includes(classDetail._id.toString())
          );
          return {
            classDetail,
            paymentDate: payment.date,
          };
        }
      );

      res.send(enrichedEnrolledClasses);
    });
    app.post("/create-payment-intent",verifyJwt,  async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentMethod = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentMethod.client_secret,
      });
    });
    app.post("/payments", verifyJwt, async (req, res) => {
      const payment = req.body;
      console.log(payment)
      const insertedResult = await paymentCollection.insertOne(payment);

      // delete the selected classes
      const selectedClassIds = payment.cartId.map(
        (id) => new ObjectId(id)
      );
      const query = { _id: { $in: selectedClassIds } };
      const deletedResult = await selectClassCollection.deleteMany(query);

      // Update the class documents
      const classIds = payment.classIds.map((id) => new ObjectId(id));
      const updateQuery = { _id: { $in: classIds } };
      const updateOperation = {
        $inc: { enrolledStudent: 1, seats: -1 },
      };
      const updateResult = await classesCollection.updateMany(
        updateQuery,
        updateOperation
      );

      res.send({ insertedResult, deletedResult, updateResult });
    });

    app.get("/users/instructors", async (req, res) => {
      const query = {role: "instructor"};
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    app.get("/dashboard/payment-history/:email", async (req, res) => {
      const email = req.params.email
      const query = {email: email}
      const result = await paymentCollection.find(query).sort({date:-1}).toArray()
      res.send(result)
    })

    app.get("/popular-classes", async (req, res) => {
      const query = {
        status: "approved",
      }
      const result = await classesCollection.find(query).sort({enrolledStudent:-1}).limit(6).toArray()
      res.send(result)
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
