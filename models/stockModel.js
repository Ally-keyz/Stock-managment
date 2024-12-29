const mongoose = require("mongoose");
const Counter = require("./counterModel");  // Import Counter model

const stockSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        product: { type: String, required: true },
        entryDate: { type: String, required: true },
        truck: { type: String, required: true },
        wBill: { type: String, required: true },
        originDestination: { type: String, required: true },
        balance: { type: String, required: true },
        entry: { type: String, required: true },
        dispatched: { type: String, required: true },
        fumugated: { type: Boolean, required: true },
        incrementId: { type: Number, unique: true },
        user: { type: mongoose.Types.ObjectId, ref: "User", required: true }, // Reference to User
    },
    { timestamps: true }
);

// Method to update incrementId for a batch of records
async function updateIncrementIdsAndSave(records) {
    try {
        // Get the current incrementId sequence from the counter
        const counter = await Counter.findOneAndUpdate(
            { _id: 'stock' },
            { $inc: { seq: records.length } },  // Increment the counter by the number of records in the batch
            { new: true, upsert: true }
        );

        // Set incrementId for each record based on the current sequence
        records.forEach((record, index) => {
            record.incrementId = counter.seq - records.length + index + 1;  // Set a unique incrementId for each record
        });

        // Save the records in bulk
        await Stock.insertMany(records);

        return { message: "Stock records saved successfully.", data: records };
    } catch (error) {
        throw new Error(error.message);
    }
}

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
