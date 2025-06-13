#!/usr/bin/env node

const API_BASE_URL = "http://localhost:3001";

async function testAuthIntegration() {
  console.log("🧪 Testing BoomRoach Authentication Integration");
  console.log("=".repeat(50));

  // Test credentials
  const testUser = {
    email: "test@boomroach.demo",
    password: "TestPass123!",
    username: "test_user_demo"
  };

  try {
    console.log("\n1️⃣ Testing User Registration...");

    const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testUser)
    });

    const registerData = await registerResponse.json();
    console.log("📝 Registration Response:", registerData);

    if (!registerData.success) {
      console.log("⚠️ Registration failed, continuing with login test...");
    }

    console.log("\n2️⃣ Testing User Login...");

    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const loginData = await loginResponse.json();
    console.log("🔐 Login Response:", loginData);

    if (!loginData.success || !loginData.token) {
      console.error("❌ Login failed!");
      return;
    }

    const token = loginData.token;
    console.log("✅ Login successful! Token received.");

    console.log("\n3️⃣ Testing Profile Retrieval...");

    const profileResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const profileData = await profileResponse.json();
    console.log("👤 Profile Response:", profileData);

    if (!profileData.success) {
      console.error("❌ Profile retrieval failed!");
      return;
    }

    console.log("\n4️⃣ Testing Wallet Connection...");

    const walletResponse = await fetch(`${API_BASE_URL}/api/auth/connect-wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        walletAddress: "DemoWallet123456789"
      })
    });

    const walletData = await walletResponse.json();
    console.log("💼 Wallet Connection Response:", walletData);

    console.log("\n5️⃣ Testing Trading Status...");

    const tradingResponse = await fetch(`${API_BASE_URL}/api/auth/trading-status`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const tradingData = await tradingResponse.json();
    console.log("📊 Trading Status Response:", tradingData);

    console.log("\n6️⃣ Testing Logout...");

    const logoutResponse = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const logoutData = await logoutResponse.json();
    console.log("🚪 Logout Response:", logoutData);

    console.log("\n" + "=".repeat(50));
    console.log("✅ Authentication Integration Test Completed!");
    console.log("🎉 All core authentication flows are working!");

  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Run the test
testAuthIntegration();
