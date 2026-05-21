const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

app.get("/api/deposit-address/:customerId", (req, res) => {
  const customerId = req.params.customerId;

  const data = JSON.parse(fs.readFileSync("deposit-addresses.json", "utf8"));

  const customer = data.find((item) => item.customerId === customerId);

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  res.json(customer);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});