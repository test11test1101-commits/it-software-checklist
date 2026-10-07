import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SOFTWARE_ITEMS = [
  // FIRST SECTION
  { section: "FIRST", order: 1, name: "Time Zone Setting", description: "Set correct time zone (Asia/Manila)" },
  { section: "FIRST", order: 2, name: "UAC (User Account Control)", description: "Configure UAC settings" },
  { section: "FIRST", order: 3, name: "Windows Update", description: "Check and apply Windows updates" },
  { section: "FIRST", order: 4, name: "Windows Activation", description: "Verify Windows is activated" },
  { section: "FIRST", order: 5, name: "Computer Name / Domain", description: "Set computer name and join domain if required" },
  { section: "FIRST", order: 6, name: "Network / IP Configuration", description: "Configure network settings and IP address" },

  // SECOND SECTION
  { section: "SECOND", order: 1, name: "Rocketchat", description: "Install and configure Rocketchat client" },
  { section: "SECOND", order: 2, name: "7-Zip", description: "Install 7-Zip file archiver" },
  { section: "SECOND", order: 3, name: "Firefox", description: "Install Mozilla Firefox browser" },
  { section: "SECOND", order: 4, name: "Acrobat Reader", description: "Install Adobe Acrobat Reader" },
  { section: "SECOND", order: 5, name: "Teamviewer", description: "Install TeamViewer remote access" },
  { section: "SECOND", order: 6, name: "AnyDesk", description: "Install AnyDesk remote desktop" },
  { section: "SECOND", order: 7, name: "MS Office 2021", description: "Install Microsoft Office 2021" },
  { section: "SECOND", order: 8, name: "Google Chrome", description: "Install Google Chrome browser" },
  { section: "SECOND", order: 9, name: "VLC Media Player", description: "Install VLC Media Player" },
  { section: "SECOND", order: 10, name: "Notepad++", description: "Install Notepad++ text editor" },

  // THIRD SECTION
  { section: "THIRD", order: 1, name: "Printer Driver", description: "Install appropriate printer drivers" },
  { section: "THIRD", order: 2, name: "Scanner Driver", description: "Install scanner drivers if applicable" },
  { section: "THIRD", order: 3, name: "Biometric/Fingerprint Driver", description: "Install biometric device drivers" },
  { section: "THIRD", order: 4, name: "Company Software / ERP", description: "Install company-specific software or ERP system" },
  { section: "THIRD", order: 5, name: "POS Software", description: "Install POS software if applicable" },
  { section: "THIRD", order: 6, name: "Accounting Software", description: "Install accounting software if applicable" },

  // FOURTH SECTION
  { section: "FOURTH", order: 1, name: "Shared Folder / Network Drive", description: "Map network drives and shared folders" },
  { section: "FOURTH", order: 2, name: "Email Configuration", description: "Setup email client and configuration" },
  { section: "FOURTH", order: 3, name: "VPN Client", description: "Install and configure VPN client if required" },
  { section: "FOURTH", order: 4, name: "Remote Desktop (RDP)", description: "Configure Remote Desktop Protocol" },
  { section: "FOURTH", order: 5, name: "User Account Creation", description: "Create user accounts and set permissions" },

  // FINAL SECTION
  { section: "FINAL", order: 1, name: "Easy Drivers / Driver Pack", description: "Install missing drivers using Easy Drivers or Driver Pack" },
  { section: "FINAL", order: 2, name: "HDD/SSD Serial Number", description: "Record HDD/SSD serial number in checklist" },
  { section: "FINAL", order: 3, name: "Anti-Virus Installation", description: "Install and update antivirus software" },
  { section: "FINAL", order: 4, name: "Anti-Virus Update / Scan", description: "Run full antivirus scan after update" },
  { section: "FINAL", order: 5, name: "System Cleanup / Disk Cleanup", description: "Run disk cleanup and optimize startup" },
  { section: "FINAL", order: 6, name: "Final Restart & System Check", description: "Restart computer and verify all software working" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrator",
      email: "admin@company.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created (username: admin, password: ChangeMe123!)");

  // Create sample branches
  const branches = ["Head Office", "Branch 1", "Branch 2", "Warehouse", "IT Department"];
  for (const name of branches) {
    await prisma.branch.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ Branches created");

  // Create software items if not already present
  const existingCount = await prisma.softwareItem.count();
  if (existingCount === 0) {
    for (const item of SOFTWARE_ITEMS) {
      await prisma.softwareItem.create({
        data: {
          section: item.section as any,
          order: item.order,
          name: item.name,
          description: item.description,
        },
      });
    }
    console.log(`✅ ${SOFTWARE_ITEMS.length} software items created`);
  } else {
    console.log(`ℹ️ ${existingCount} software items already present, skipping duplicate creation.`);
  }

  console.log("\n🎉 Seeding complete!");
  console.log("Default credentials:");
  console.log("  Username: admin");
  console.log("  Password: ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
