import { addTenantAttributeToAllUsers } from "../services/addTenantToAllUsers";

async function run() {
  try {
    await addTenantAttributeToAllUsers(
      "cmibkonwo00098o2bmgwqncic", // tenantId
      "DOTSPEAK_NGO-11-25-002"    // tenantCode
    );

    console.log("✅ Tenant attribute migration completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

run();
