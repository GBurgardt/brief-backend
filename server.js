const express = require("express");
const app = express();
const cors = require("cors");

const audioProcessorRoutes = require("./routes/audioProcessorRoute");

app.use(cors());
app.use(express.json());
app.use("/api", audioProcessorRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
