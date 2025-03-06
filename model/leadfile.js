const { DataTypes } = require("sequelize");
const { sequelize }= require("./connection");

const Leadsample = sequelize.define("Leadsample", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    uid: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.TEXT,
        
        allowNull: false,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    short_description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    semrush_global_rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    semrush_visits_latest_month: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    num_investors: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    funding_total: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    num_exits: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    num_funding_rounds: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    last_funding_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    last_funding_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    num_acquisitions: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    apptopia_total_apps: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    apptopia_total_downloads: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    contact_email: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    phone_number: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    facebook: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    linkedin: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    twitter: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    num_investments: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    num_lead_investments: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    num_lead_investors: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    listed_stock_symbol: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    company_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    hub_tags: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    operating_status: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    founded_on: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    categories: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    founders: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    website: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ipo_status: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    num_employees_enum: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    locations: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    growth_insight_description: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    growth_insight_indicator: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    growth_insight_direction: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    growth_insight_confidence: {
        type: DataTypes.STRING(1000),
        allowNull: true,
    },
    investors_insight_description: {
        type: DataTypes.STRING(1050),
        allowNull: true,
    },
    permalink: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    userId:{
        type:DataTypes.INTEGER,
       
    },
}, {
    timestamps: false,
    tableName: "sheet_data",
    
});


module.exports = Leadsample;
