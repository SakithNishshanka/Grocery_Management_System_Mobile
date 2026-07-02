const Store = require("../models/Store");
const Product = require("../models/Product");

const addStockStats = async (stores) => {
  const storeIds = stores.map((store) => store._id);
  const [stats, products] = await Promise.all([
    Product.aggregate([
      { $match: { store: { $in: storeIds }, isAvailable: true } },
      {
        $group: {
          _id: "$store",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$stockQuantity" },
        },
      },
    ]),
    Product.find({ store: { $in: storeIds }, isAvailable: true })
      .select("name stockQuantity category store")
      .sort({ name: 1 }),
  ]);

  const statsByStore = new Map(stats.map((item) => [String(item._id), item]));
  const productsByStore = new Map();

  products.forEach((product) => {
    const storeId = String(product.store);
    const storeProducts = productsByStore.get(storeId) || [];
    storeProducts.push({
      _id: product._id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      category: product.category,
    });
    productsByStore.set(storeId, storeProducts);
  });

  return stores.map((store) => {
    const storeObject = store.toObject();
    const storeStats = statsByStore.get(String(store._id));
    return {
      ...storeObject,
      productCount: storeStats?.productCount || 0,
      totalStock: storeStats?.totalStock || 0,
      products: productsByStore.get(String(store._id)) || [],
    };
  });
};

const getAllStores = async (req, res) => {
  try {
    const stores = await Store.find();
    return res.json(await addStockStats(stores));
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    const [storeWithStats] = await addStockStats([store]);
    return res.json(storeWithStats);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createStore = async (req, res) => {
  const { name, location, contactNumber, openingHours, availabilityStatus, imageBase64 } = req.body;

  if (!name || !location) {
    return res.status(400).json({ message: "Name and location are required" });
  }

  try {
    const storeData = { name, location, contactNumber, openingHours, availabilityStatus };
    if (imageBase64) storeData.imageUrl = imageBase64;

    const store = await Store.create(storeData);
    return res.status(201).json(store);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateStore = async (req, res) => {
  try {
    const { imageBase64, ...rest } = req.body;
    const updates = { ...rest };
    if (imageBase64) updates.imageUrl = imageBase64;

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json(store);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteStore = async (req, res) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    return res.json({ message: "Store deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getAllStores, getStore, createStore, updateStore, deleteStore };
