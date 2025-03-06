const sequalize = require("../model/connection");
let path = require("path");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const fs = require("fs");
const multer = require("multer");
// const  UserData = require("../model/user");
// const Leadsample =require("../model/leadfile") 
const { Op } = require("sequelize");
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage }).array("attachments"); 
const { Leadsample, UserData } = require("../model/assosiation");
exports.AllUsers = function (req, res) {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).send("All fields are required.");
  }

  // Check if email already exists
  const checkEmailQuery = "SELECT * FROM user_data WHERE email = ?";
  pool.query(checkEmailQuery, [email], (error, results) => {
    if (error) {
      console.error("Error checking email:", error);
      return res.status(500).send("Internal Server Error");
    }

    if (results.length > 0) {
      console.log("Email already exists:", email);
      return res.redirect("/users/feedback");
    } else {
      // Insert new user record
      const sql =
        "INSERT INTO user_data (name, email, password) VALUES (?, ?, ?)";
      pool.query(sql, [name, email, password], (error, result) => {
        if (error) {
          console.error("Error inserting student:", error);
          return res.status(500).send("Internal Server Error");
        }

        return res.redirect("/users/fetch-user");
      });
    }
  });
};

// fetch users

exports.loginpage = (req, res) => {
  if (req.session.user) {
    return res.redirect("/users/tables");
  }
  res.render("loginpage");
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // console.log('email, pass===', req.body);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required!" });
    }

    if (req.session.user) {
      return res.status(403).json({ error: "User already logged in! Logout first." });
    }

    const user = await UserData.findOne({ where: { email } });
    // console.log("Found user:", user);

    if (!user || String(user.password) !== String(password)) {
      return res.status(401).json({ error: "Invalid email or password!" });
    }

    // Store user session securely
    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };

    // Return JSON response with role
    res.json({ status: "success", message: "Login successful!", user: req.session.user });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
};


// Logout route
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed!" });
    }
    res
      .status(200)
      .json({ message: "Logout successful", redirect: "/users/login" });
  });
};


exports.dashboard = (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) page = 1; // Default to page 1 if invalid

    let limit = 5; // Show 5 records per page
    let offset = (page - 1) * limit; // Calculate offset

    let countQuery = "SELECT COUNT(*) AS total FROM sheet_data";
    pool.query(countQuery, (countError, countResults) => {
      if (countError) {
        console.error("Error fetching total count:", countError);
        return res
          .status(500)
          .json({ error: "Error fetching total records count" });
      }

      let totalRecords = countResults[0].total;
      let totalPages = Math.ceil(totalRecords / limit);

      let usersQuery = "SELECT * FROM sheet_data LIMIT ? OFFSET ?";
      pool.query(usersQuery, [limit, offset], (error, results) => {
        if (error) {
          console.error("Error fetching users:", error);
          return res.status(500).json({ error: "Error fetching users data" });
        }

        res.render("index", {
          users: results,
          currentPage: page,
          totalPages: totalPages,
          totalRecords: totalRecords, // Useful for UI display
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a file." });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (sheetData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Excel file is empty." });
    }

    // ✅ Ensure user is logged in
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ message: "Unauthorized: User session not found" });
    }

    const sessionUserId = req.session.user.id; // Logged-in user ID

    // ✅ Fetch user from `user_data` table
    const user = await UserData.findOne({ where: { id: sessionUserId } });

    if (!user) {
      return res.status(404).json({ message: "User not found in user_data table" });
    }

    const userIdFromDB = user.id; // ID from user_data table

    // ✅ Extract all UIDs from sheet data
    const uids = sheetData.map(row => row.uid).filter(uid => uid);

    // ✅ Check which UIDs already exist
    const existingUIDs = await Leadsample.findAll({
      attributes: ["uid"],
      where: {
        uid: { [Op.in]: uids },
      },
    });

    const existingUIDSet = new Set(existingUIDs.map(record => record.uid));

    // ✅ Filter new records and attach user ID
    const newData = sheetData
      .filter(row => !existingUIDSet.has(row.uid))
      .map(row => ({
        ...row,
        userId: userIdFromDB, // ✅ Save user ID from user_data table
      }));

    if (newData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ message: "No new records to insert." });
    }

    // ✅ Bulk insert data with user ID
    await Leadsample.bulkCreate(newData);
    fs.unlinkSync(filePath);

    return res.status(200).json({ message: `${newData.length} new records inserted successfully!` });
  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};




exports.tables = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const search = req.query.search?.trim() ? `%${req.query.search}%` : "%";
    const offset = (page - 1) * limit;

    let categoryFilter = {};
    if (req.query.categories) {
      const categories = req.query.categories.split(",").map(c => c.trim());
      if (categories.length > 0) {
        categoryFilter.categories = { [Op.and]: categories.map(cat => ({ [Op.like]: `%${cat}%` })) };
      }
    }

    let dateFilter = {};
    if (req.query.startDate) {
      dateFilter.created_at = { [Op.gte]: req.query.startDate };
    }
    if (req.query.endDate) {
      dateFilter.created_at = { 
        ...(dateFilter.created_at || {}),
        [Op.lte]: req.query.endDate 
      };
    }

    const whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: search } },
        { short_description: { [Op.like]: search } },
        { contact_email: { [Op.like]: search } }
      ],
      ...categoryFilter,
      ...dateFilter
    };

    const totalRecords = await Leadsample.count({ where: whereCondition });
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

    const results = await Leadsample.findAll({
      where: whereCondition,
      attributes: ["id", "name", "short_description", "contact_email", "phone_number", "categories", "created_at"],
      order: [["id", "ASC"]],
      limit,
      offset
    });

    if (req.xhr || req.headers.accept.includes("json")) {
      return res.json({ users: results, currentPage: page, totalPages, totalRecords });
    }

    res.render("tables_bootstrap", { users: results, currentPage: page, totalPages, totalRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



exports.delete = async function (req, res) {
  const id = req.body.id;

  if (!id) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid ID provided." });
  }

  try {
    const deletedRecordCount = await Leadsample.destroy({ where: { id } });

    if (deletedRecordCount === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found." });
    }

    res
      .status(200)
      .json({ status: "success", message: "Record deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete record." });
  }
};


exports.detail = async (req, res) => {
  try {
    const { id } = req.query;
    
    const result = await Leadsample.findOne({
      where: { id }
    });

    if (!result) {
      return res.status(404).send("Record not found");
    }

    res.render("detail", { users: [result] }); // Keeping the array structure as in the original code
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.update = async function (req, res) {
  try {
    const id = req.body.id || req.query.id;
    // console.log("id==", id);

    if (!id) {
      return res.status(400).json({ status: "error", message: "ID is required." });
    }

    const allowedFields = [
      "name", "contact_email", "phone_number", "url", "permalink", "short_description",
      "categories", "founders", "company_type", "operating_status", "ipo_status",
      "listed_stock_symbol", "num_employees_enum", "locations", "founded_on", "hub_tags",
      "growth_insight_description", "growth_insight_indicator", "growth_insight_direction",
      "growth_insight_confidence", "investor_insight_description", "num_investors",
      "num_lead_investments", "num_lead_investors", "num_investments", "num_exits",
      "num_funding_rounds", "last_funding_type", "last_funding_at", "funding_total",
      "num_acquisitions", "apptopia_total_apps", "apptopia_total_downloads",
      "semrush_global_rank", "semrush_visits_latest_month", "created_at"
    ];

    // Filter out only allowed fields from request body
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] && typeof req.body[key] === "string" && req.body[key].trim() !== "") {
        updateData[key] = req.body[key].trim();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ status: "error", message: "No valid fields to update." });
    }

    const [updatedRows] = await Leadsample.update(updateData, { where: { id } });

    if (updatedRows === 0) {
      return res.status(404).json({ status: "error", message: "No record found to update." });
    }

    res.json({ status: "success", message: "User updated successfully." });
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ status: "error", message: "Database error. Please try again." });
  }
};










exports.sendEmail = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ status: "error", message: "File upload failed" });
    }

    try {
      const { ftoemail: toEmail, fccemail: ccEmail, fsubject: subject, ftextarea: message } = req.body;

      // Validate required fields
      if (!toEmail || !subject || !message) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
      }

      // Process CC emails
      const ccEmailList = ccEmail
        ? ccEmail.split(",").map(email => email.trim()).filter(email => email !== "")
        : [];

      // Convert uploaded files to nodemailer attachments
      const attachments = req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer, // Using file content directly from memory
      }));

      // Defer email sending to prevent blocking the request cycle
      setImmediate(async () => {
        try {
          // Create email transporter
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          // Mail options
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            cc: ccEmailList.length > 0 ? ccEmailList : undefined,
            subject: subject,
            html: message,
            attachments: attachments.length > 0 ? attachments : undefined, // Attach only if files exist
          };

          // Send email
          const info = await transporter.sendMail(mailOptions);
          console.log("Email sent:", info.response);
        } catch (error) {
          console.error("Error sending email:", error);
        }
      });

      return res.status(200).json({ status: "success", message: "Email sending initiated!" });
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });
};


exports.userlist = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const search = req.query.search?.trim() ? `%${req.query.search}%` : "%";
    const offset = (page - 1) * limit;

    const whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: search } },
        { email: { [Op.like]: search } },
        
      ]
    };

    const totalRecords = await UserData.count({ where: whereCondition });
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

    const results = await UserData.findAll({
      where: whereCondition,
      attributes: ["id", "name", "email","role", "status", "assign","createdAt"],
      order: [["id", "ASC"]],
      limit,
      offset
    });

    if (req.xhr || req.headers.accept.includes("json")) {
      return res.json({ users: results, currentPage: page, totalPages, totalRecords });
    }

    res.render("users_list", { users: results, currentPage: page, totalPages, totalRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.adduser = async (req, res) => {
  res.render("Add_user")
};



exports.signup_user = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate user input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the user already exists
    const existingUser = await UserData.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Hash password
    

    // Save user to DB
    const newUser = await UserData.create({
      name,
      email,
      password, // Ensure password is hashed and passed correctly
    });

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.userdelete = async function (req, res) {
  const id = req.body.id;

  if (!id) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid ID provided." });
  }

  try {
    const deletedRecordCount = await UserData.destroy({ where: { id } });

    if (deletedRecordCount === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found." });
    }

    res
      .status(200)
      .json({ status: "success", message: "Record deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete record." });
  }
};

exports.userdetail = async (req, res) => {
  try {
    const { id } = req.query;
    
    const result = await UserData.findOne({
      where: { id }
    });

    if (!result) {
      return res.status(404).send("Record not found");
    }

    res.render("user_detail", { users: [result] }); // Keeping the array structure as in the original code
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.userupdate = async function (req, res) {
  try {
    const id = req.body.id || req.query.id;
    // console.log("id==", id);

    if (!id) {
      return res.status(400).json({ status: "error", message: "ID is required." });
    }

    const allowedFields = [
      "name", "email", "password", "role", "status", "assign",

    ];

    // Filter out only allowed fields from request body
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] && typeof req.body[key] === "string" && req.body[key].trim() !== "") {
        updateData[key] = req.body[key].trim();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ status: "error", message: "No valid fields to update." });
    }

    const [updatedRows] = await UserData.update(updateData, { where: { id } });

    if (updatedRows === 0) {
      return res.status(404).json({ status: "error", message: "No record found to update." });
    }

    res.json({ status: "success", message: "User updated successfully." });
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ status: "error", message: "Database error. Please try again." });
  }
};



exports.usersview = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/users/login");
  }

  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(400).json({ error: "User ID is missing in session" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";
    const categories = req.query.categories ? req.query.categories.split(",") : [];
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: "Start date cannot be after end date" });
    }

    let whereCondition = {};

    if (userId) {
      whereCondition.userId = userId;
    }

    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact_email: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } }
      ];
    }

    if (categories.length) {
      whereCondition.categories = { [Op.or]: categories.map(cat => ({ [Op.like]: `%${cat}%` })) };
    }

    if (startDate && endDate) {
      whereCondition.created_at = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await Leadsample.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      include: [{ model: UserData, as: "user", attributes: ["status"] }]
    });

    res.render("users_view", {
      users: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

