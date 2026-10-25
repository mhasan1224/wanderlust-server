import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
let isDbConnected = false;

export async function connectToMongoDB() {
  try {
    await client.connect();
    isDbConnected = true;
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    isDbConnected = false;
    console.dir(err);
  }
}

await connectToMongoDB();

function parseDestinationBody(body) {
  if (typeof body !== "object" || body === null) return null;

  const text = (key) => (typeof body[key] === "string" ? body[key].trim() : "");
  const price =
    typeof body.price === "number" ? body.price : Number(body.price);

  const destination = {
    destinationName: text("destinationName"),
    country: text("country"),
    category: text("category"),
    price,
    duration: text("duration"),
    departureDate: text("departureDate"),
    imageUrl: text("imageUrl"),
    description: text("description"),
  };

  const requiredFields = [
    destination.destinationName,
    destination.country,
    destination.category,
    destination.duration,
    destination.departureDate,
    destination.imageUrl,
    destination.description,
  ];

  if (requiredFields.some((value) => value.length === 0)) return null;
  if (!Number.isFinite(destination.price) || destination.price < 0) return null;

  return destination;
}

app.post("/AddDestinationForm", async (req, res) => {
  if (!isDbConnected) {
    return res
      .status(503)
      .json({
        message: "Database is not connected yet. Please try again later.",
      });
  }

  const data = parseDestinationBody(req.body);
  if (!data) {
    return res
      .status(400)
      .json({ message: "Please fill in every field with a valid value." });
  }

  try {
    const result = await client
      .db("wanderlust")
      .collection("destinations")
      .insertOne({
        ...data,
        createdAt: new Date(),
      });
    console.log("Destination saved with id:", result.insertedId);
    res.status(201).json({
      message: "Travel package added successfully.",
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.dir(err);
    res
      .status(500)
      .json({
        message: "Could not save the travel package. Please try again.",
      });
  }
});

app.get("/destinations", async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({
      message: "Database is not connected yet.",
    });
  }

  try {
    const result = await client
      .db("wanderlust")
      .collection("destinations")
      .find({})
      .toArray();

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to fetch destinations:", err);
    res.status(500).json({
      message: "Could not fetch destinations.",
    });
  }
});


app.get("/destinations/:id", async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({
      message: "Database is not connected yet.",
    });
  }

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid destination ID.",
      });
    }

    const result = await client
      .db("wanderlust")
      .collection("destinations")
      .findOne({ _id: new ObjectId(id) });

    if (!result) {
      return res.status(404).json({
        message: "Destination not found.",
      });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to fetch destination:", err);

    res.status(500).json({
      message: "Could not fetch destination.",
    });
  }
});


//http://localhost:5000/AddDestinationForm

app.get("/", (req, res) => {
  res.send({ message: "Server is running smoothly!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
