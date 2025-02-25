const pool = require("../model/connection");
let path = require("path");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const fs = require("fs");
// const { sendMail } = require("../utils/sendmail");
// const randomstring = require("randomstring");

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

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required!" });
  }

  // Check if user is already logged in
  if (req.session.user) {
    // console.log("kjk", req.session.user);
    return res
      .status(403)
      .json({ error: "User already logged in! Logout first." });
  }

  const sql = "SELECT * FROM user_data WHERE email = ? AND password = ?";
  pool.query(sql, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error!" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials!" });
    }

    // Store user session
    req.session.user = results[0];
    // console.log("session id ", req.session.user);
    res.render("index", { users: results });
  });
};

// Middleware to check if user is logged in

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

// exports.dashboard = (req, res) => {
//   // Define your SQL query to fetch user data (adjust the query as needed)
//   const usersQuery = "SELECT * FROM sheet_data";

//   // Execute the query using your database connection (e.g., pool.query)
//   pool.query(usersQuery, (err, results) => {
//     if (err) {
//       console.error("Error fetching users:", err);
//       return res.status(500).send("Internal Server Error");
//     }

//     // Pass the results to your view under the name 'users'
//     res.render("dashboard", { users: results });
//   });
// };

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
    console.log("File uploaded to:", filePath);

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; 
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (sheetData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty." });
    }

    // Extract all UIDs from the sheet data
    const uids = sheetData.map(row => row.id).filter(uid => uid);

    // Check which UIDs already exist in the database
    const existingUIDsQuery = `SELECT uid FROM sheet_data WHERE uid IN (?)`;

    pool.query(existingUIDsQuery, [uids], (err, existingResults) => {
      if (err) {
        console.error("Error checking existing UIDs:", err);
        return res.status(500).send("Internal Server Error");
      }

      const existingUIDs = new Set(existingResults.map(row => row.uid));

      // Filter out rows with existing UIDs
      const newData = sheetData.filter(row => !existingUIDs.has(row.id));

      if (newData.length === 0) {
        return res.render("index",{ message: "No new records to insert." });
      }

      const insertQuery = `
        INSERT INTO sheet_data (
          uid, created_at, name, short_description, semrush_global_rank, semrush_visits_latest_month, 
          num_investors, funding_total, num_exits, num_funding_rounds, last_funding_type, last_funding_at, 
          num_acquisitions, apptopia_total_apps, apptopia_total_downloads, contact_email, phone_number, 
          facebook, linkedin, twitter, num_investments, num_lead_investments, num_lead_investors, 
          listed_stock_symbol, company_type, hub_tags, operating_status, founded_on, categories, 
          founders, website, ipo_status, num_employees_enum, locations, growth_insight_description, 
          growth_insight_indicator, growth_insight_direction, growth_insight_confidence, 
          investors_insight_description, permalink, url
        ) 
        VALUES ?
      `;

      const values = newData.map(row => [
        row.id || null,
        row.created_at || null,
        row.name || null,
        row.short_description || null,
        row.semrush_global_rank || null,
        row.semrush_visits_latest_month || null,
        row.num_investors || null,
        row.funding_total || null,
        row.num_exits || null,
        row.num_funding_rounds || null,
        row.last_funding_type || null,
        row.last_funding_at || null,
        row.num_acquisitions || null,
        row.apptopia_total_apps || null,
        row.apptopia_total_downloads || null,
        row.contact_email || null,
        row.phone_number || null,
        row.facebook || null,
        row.linkedin || null,
        row.twitter || null,
        row.num_investments || null,
        row.num_lead_investments || null,
        row.num_lead_investors || null,
        row.listed_stock_symbol || null,
        row.company_type || null,
        row.hub_tags || null,
        row.operating_status || null,
        row.founded_on || null,
        row.categories || null,
        row.founders || null,
        row.website || null,
        row.ipo_status || null,
        row.num_employees_enum || null,
        row.locations || null,
        row.growth_insight_description || null,
        row.growth_insight_indicator || null,
        row.growth_insight_direction || null,
        row.growth_insight_confidence || null,
        row.investors_insight_description || null,
        row.permalink || null,
        row.url || null,
      ]);

      pool.query(insertQuery, [values], (insertError, results) => {
        if (insertError) {
          console.error("Error inserting data:", insertError);
          return res.status(500).send("Internal Server Error");
        }

        res.render("index",{ message: `${newData.length} new records inserted successfully!` });
      });
    });
  } catch (error) {
    console.error("File upload error:", error);
    return res.render("index",{ error: "Internal server error", details: error.message });
  }
};


exports.tables = (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const search = req.query.search?.trim() ? `%${req.query.search}%` : "%";
    const offset = (page - 1) * limit;

    let categoryFilter = "";
    let categoryValues = [];

    if (req.query.categories) {
      const categories = req.query.categories.split(",").map(c => c.trim());
      if (categories.length > 0) {
        categoryFilter = `AND (${categories.map(() => "categories LIKE ?").join(" AND ")})`;
        categoryValues = categories.map(cat => `%${cat}%`);
      }
    }

    let dateFilter = "";
    let dateValues = [];

    if (req.query.startDate) {
      dateFilter += " AND created_at >= ?";
      dateValues.push(req.query.startDate);
    }

    if (req.query.endDate) {
      dateFilter += " AND created_at <= ?";
      dateValues.push(req.query.endDate);
    }

    const countQuery = `
      SELECT COUNT(*) AS total FROM sheet_data 
      WHERE (name LIKE ? OR short_description LIKE ? OR contact_email LIKE ?) 
      ${categoryFilter} ${dateFilter}
    `;

    pool.query(
      countQuery,
      [search, search, search, ...categoryValues, ...dateValues],
      (countError, countResults) => {
        if (countError) return res.status(500).json({ error: "Internal Server Error" });

        const totalRecords = countResults[0].total;
        const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

        const dataQuery = `
          SELECT id, name, short_description, contact_email, phone_number, categories, created_at 
          FROM sheet_data 
          WHERE (name LIKE ? OR short_description LIKE ? OR contact_email LIKE ?) 
          ${categoryFilter} ${dateFilter} 
          ORDER BY id ASC LIMIT ? OFFSET ?
        `;

        pool.query(
          dataQuery,
          [search, search, search, ...categoryValues, ...dateValues, limit, offset],
          (error, results) => {
            if (error) return res.status(500).json({ error: "Internal Server Error" });

            if (req.xhr || req.headers.accept.includes("json")) {
              return res.json({ users: results, currentPage: page, totalPages, totalRecords });
            }

            res.render("tables_bootstrap", { users: results, currentPage: page, totalPages, totalRecords });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete = function (req, res) {
  const id = req.body.id;

  if (!id) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid ID provided." });
  }

  const sql = "DELETE FROM sheet_data WHERE id = ?";

  pool.query(sql, [id], function (error, result) {
    if (error) {
      console.error("Delete error:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Failed to delete record." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found." });
    }

    res
      .status(200)
      .json({ status: "success", message: "Record deleted successfully." });
  });
};

exports.detail = (req, res) => {
  var id = req.query.id;
  var sql = "SELECT * FROM sheet_data WHERE id = ?";

  pool.query(sql, [id], function (error, result) {
    if (error) {
      console.error("Error fetching student details:", error);
      return res.status(500).send("Internal Server Error");
    }
    res.render("detail", { users: result });
  });
};

exports.update = function (req, res) {
  const id = req.body.id || req.query.id || req.param.id; // Removed req.params.id
  console.log("id==", id);

  if (!id) {
    return res
      .status(400)
      .json({ status: "error", message: "ID is required." });
  }

  const allowedFields = [
    "id",
    "name",
    "contact_email",
    "phone_number",
    "url",
    "permalink",
    "short_description",
    "categories",
    "founders",
    "company_type",
    "operating_status",
    "ipo_status",
    "listed_stock_symbol",
    "num_employees_enum",
    "locations",
    "founded_on",
    "hub_tags",
    "growth_insight_description",
    "growth_insight_indicator",
    "growth_insight_direction",
    "growth_insight_confidence",
    "investor_insight_description",
    "num_investors",
    "num_lead_investments",
    "num_lead_investors",
    "num_investments",
    "num_exits",
    "num_funding_rounds",
    "last_funding_type",
    "last_funding_at",
    "funding_total",
    "num_acquisitions",
    "apptopia_total_apps",
    "apptopia_total_downloads",
    "semrush_global_rank",
    "semrush_visits_latest_month",
    "created_at",
    "short_description",
  ];

  const updateFields = [];
  const values = [];

  // Log received request body for debugging
  // console.log("Received update request:", req.body);

  Object.entries(req.body).forEach(([key, value]) => {
    if (
      allowedFields.includes(key) &&
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      updateFields.push(`${key} = ?`);
      values.push(value.trim());
    }
  });


  if (updateFields.length === 0) {
    return res
      .status(400)
      .json({ status: "error", message: "No valid fields to update." });
  }

  const updateSql = `UPDATE sheet_data SET ${updateFields.join(
    ", "
  )} WHERE id = ?`;
  values.push(id);

  
  pool.query(updateSql, values, function (updateError, updateResult) {
    if (updateError) {
      console.error("Database error:", updateError.sqlMessage);
      return res
        .status(500)
        .json({
          status: "error",
          message: "Database error. Please try again.",
        });
    }

    if (updateResult.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No record found to update." });
    }

    res.json({ status: "success", message: "User updated successfully." });
  });
};





const multer = require("multer");

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage }).array("attachments"); 

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

      // Convert uploaded files to nodemailer attachments
      const attachments = req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer, // Using file content directly from memory
      }));

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

      return res.status(200).json({ status: "success", message: "Email sent successfully!" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });
};













