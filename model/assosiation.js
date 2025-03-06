const UserData = require("./user");
const Leadsample = require("./leadfile");

// Define associations here
UserData.hasMany(Leadsample, { foreignKey: "userId", as: "leadSamples" });
Leadsample.belongsTo(UserData, { foreignKey: "userId", as: "user" });

module.exports =  { UserData, Leadsample };