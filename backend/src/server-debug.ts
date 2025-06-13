console.log("🔥 DEBUG: Starting server debug version");

try {
  console.log("🔥 DEBUG: Importing basic modules...");
  import("http").then(() => console.log("✅ http imported"));
  import("compression").then(() => console.log("✅ compression imported"));
  import("cors").then(() => console.log("✅ cors imported"));
  import("express").then(() => console.log("✅ express imported"));
  import("helmet").then(() => console.log("✅ helmet imported"));
  import("morgan").then(() => console.log("✅ morgan imported"));

  console.log("🔥 DEBUG: Importing PrismaClient...");
  import("@prisma/client").then(() => console.log("✅ PrismaClient imported"));

  console.log("🔥 DEBUG: Importing security middleware...");
  import("./middleware/security").then(() => console.log("✅ security middleware imported"));

  console.log("🔥 DEBUG: Importing core middleware...");
  import("./middleware/error-handler").then(() => console.log("✅ error-handler imported"));
  import("./middleware/auth").then(() => console.log("✅ auth imported"));
  import("./middleware/performance").then(() => console.log("✅ performance imported"));

  console.log("🔥 DEBUG: Importing services...");
  import("./services/websocket").then(() => console.log("✅ websocket imported"));
  import("../../shared/utils/monitoring").then(() => console.log("✅ monitoring imported"));
  import("../../shared/utils/logger").then(() => console.log("✅ logger imported"));

  console.log("🔥 DEBUG: Importing routes...");
  import("./routes/auth").then(() => console.log("✅ auth routes imported"));
  import("./routes/enhanced-auth").then(() => console.log("✅ enhanced-auth routes imported"));
  import("./routes/trading").then(() => console.log("✅ trading routes imported"));

  setTimeout(() => {
    console.log("🔥 DEBUG: All imports attempted");
    console.log("🔥 DEBUG: Debug server exiting normally");
  }, 2000);

} catch (error) {
  console.error("🔥 ERROR during imports:", error);
  process.exit(1);
}
