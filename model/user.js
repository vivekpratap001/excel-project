const { DataTypes } = require("sequelize");
const { sequelize } = require("./connection");

const UserData = sequelize.define(
  "UserData",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true, // Ensures valid email format
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
     
    },

    status: {
      type: DataTypes.STRING,
     
    },
    assign: {
      type: DataTypes.STRING,
     
    },
  },
  {
    timestamps: true,
    tableName: "user_data", 
  }
);

module.exports = UserData;
