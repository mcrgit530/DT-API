const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const app = express();

const PORT = 3000;
const DB_URI = "mongodb://localhost:27017"; 
const DB_NAME = "eventDB";
const COLLECTION_NAME = "events";


app.use(express.json());

const upload = multer({ dest: "uploads/" });

let db;
MongoClient.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((client) => {
    db = client.db(DB_NAME);
    console.log("Connected to database");
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
    process.exit(1);
  });


app.get("/api/v3/app/events", async (req, res) => {
  const { id, type, limit = 5, page = 1 } = req.query;
  try {
    const collection = db.collection(COLLECTION_NAME);

    if (id) {
      const event = await collection.findOne({ _id: new ObjectId(id) });
      if (event) {
        return res.json(event);
      } else {
        return res.status(404).json({ error: "Event not found" });
      }
    } else if (type === "latest") {
      const events = await collection
        .find({})
        .sort({ schedule: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .toArray();
      return res.json(events);
    } else {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/v3/app/events", upload.single("files[image]"), async (req, res) => {
  try {
    const {
      name,
      tagline,
      schedule,
      description,
      moderator,
      category,
      sub_category,
      rigor_rank,
    } = req.body;

    const event = {
      type: "event",
      uid: Math.floor(Math.random() * 100), 
      name,
      tagline,
      schedule: new Date(schedule),
      description,
      files: { image: req.file?.path },
      moderator,
      category,
      sub_category,
      rigor_rank: parseInt(rigor_rank),
      attendees: [],
    };

    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.insertOne(event);

    res.status(201).json({ id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/v3/app/events/:id", upload.single("files[image]"), async (req, res) => {
  const { id } = req.params;
  try {
    const {
      name,
      tagline,
      schedule,
      description,
      moderator,
      category,
      sub_category,
      rigor_rank,
    } = req.body;

    const updatedEvent = {
      $set: {
        name,
        tagline,
        schedule: new Date(schedule),
        description,
        files: { image: req.file?.path },
        moderator,
        category,
        sub_category,
        rigor_rank: parseInt(rigor_rank),
      },
    };

    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.updateOne({ _id: new ObjectId(id) }, updatedEvent);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});



app.delete("/api/v3/app/events/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  try {
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
