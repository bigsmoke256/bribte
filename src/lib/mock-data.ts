// Mock data for the BRIBTE Campus Management System

export type UserRole = "student" | "lecturer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
  department?: string;
  program?: string;
  year?: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  credits: number;
  schedule: string;
  room: string;
}

export interface Assignment {
  id: string;
  courseCode: string;
  courseName: string;
  title: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded";
  grade?: number;
  maxGrade: number;
}

export interface Payment {
  id: string;
  studentName: string;
  studentId: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  receiptUrl?: string;
  semester: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  priority: "low" | "medium" | "high";
  target: "all" | "students" | "lecturers";
}

export interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  courseCode: string;
  courseName: string;
  room: string;
  lecturer: string;
}

export const mockStudentUser: User = {
  id: "s001",
  name: "Nakamya Sarah",
  email: "sarah.nakamya@bribte.ac.ug",
  role: "student",
  studentId: "BRI/2024/0451",
  department: "Business Administration",
  program: "Bachelor of Business Administration",
  year: 2,
};

export const mockLecturerUser: User = {
  id: "l001",
  name: "Dr. Ssempala Robert",
  email: "robert.ssempala@bribte.ac.ug",
  role: "lecturer",
  department: "Information Technology",
};

export const mockAdminUser: User = {
  id: "a001",
  name: "Nalubega Grace",
  email: "grace.nalubega@bribte.ac.ug",
  role: "admin",
  department: "Administration",
};

export const mockCourses: Course[] = [
  { id: "c1", code: "BBA201", name: "Financial Accounting II", lecturer: "Dr. Kato James", credits: 4, schedule: "Mon & Wed 8:00-10:00", room: "Block A, Room 204" },
  { id: "c2", code: "BBA202", name: "Business Statistics", lecturer: "Ms. Atim Patricia", credits: 3, schedule: "Tue & Thu 10:00-11:30", room: "Block B, Room 101" },
  { id: "c3", code: "BBA203", name: "Principles of Marketing", lecturer: "Dr. Mugisha Allan", credits: 3, schedule: "Mon & Fri 14:00-15:30", room: "Block A, Room 305" },
  { id: "c4", code: "BBA204", name: "Business Law", lecturer: "Mr. Okello David", credits: 3, schedule: "Wed & Fri 8:00-9:30", room: "Block C, Room 102" },
  { id: "c5", code: "BBA205", name: "Human Resource Management", lecturer: "Dr. Namutebi Rose", credits: 3, schedule: "Tue & Thu 14:00-15:30", room: "Block B, Room 203" },
];

export const mockAssignments: Assignment[] = [
  { id: "a1", courseCode: "BBA201", courseName: "Financial Accounting II", title: "Balance Sheet Analysis", dueDate: "2026-03-15", status: "pending", maxGrade: 100 },
  { id: "a2", courseCode: "BBA202", courseName: "Business Statistics", title: "Regression Analysis Report", dueDate: "2026-03-10", status: "submitted", maxGrade: 50 },
  { id: "a3", courseCode: "BBA203", courseName: "Principles of Marketing", title: "Marketing Plan Project", dueDate: "2026-03-20", status: "pending", maxGrade: 100 },
  { id: "a4", courseCode: "BBA204", courseName: "Business Law", title: "Case Study: Contract Law", dueDate: "2026-02-28", status: "graded", grade: 78, maxGrade: 100 },
  { id: "a5", courseCode: "BBA205", courseName: "Human Resource Management", title: "HR Policy Analysis", dueDate: "2026-03-05", status: "graded", grade: 85, maxGrade: 100 },
];

export const mockPayments: Payment[] = [
  { id: "p1", studentName: "Nakamya Sarah", studentId: "BRI/2024/0451", amount: 1500000, date: "2026-02-10", status: "approved", semester: "Semester 1, 2025/2026" },
  { id: "p2", studentName: "Tumwine Brian", studentId: "BRI/2024/0322", amount: 800000, date: "2026-02-28", status: "pending", semester: "Semester 1, 2025/2026" },
  { id: "p3", studentName: "Achieng Diana", studentId: "BRI/2024/0198", amount: 1500000, date: "2026-03-01", status: "approved", semester: "Semester 1, 2025/2026" },
  { id: "p4", studentName: "Musoke Peter", studentId: "BRI/2024/0567", amount: 500000, date: "2026-03-03", status: "pending", semester: "Semester 1, 2025/2026" },
  { id: "p5", studentName: "Namubiru Joy", studentId: "BRI/2024/0089", amount: 1200000, date: "2026-03-05", status: "rejected", semester: "Semester 1, 2025/2026" },
];

export const mockAnnouncements: Announcement[] = [
  { id: "an1", title: "Mid-Semester Examinations Schedule", content: "Mid-semester examinations will begin on March 25, 2026. Students are advised to check the timetable on the portal.", date: "2026-03-05", author: "Academic Registrar", priority: "high", target: "all" },
  { id: "an2", title: "Fee Payment Deadline Extended", content: "The deadline for semester fees payment has been extended to March 20, 2026. Students with outstanding balances should clear immediately.", date: "2026-03-03", author: "Finance Office", priority: "high", target: "students" },
  { id: "an3", title: "Guest Lecture: Entrepreneurship in East Africa", content: "A guest lecture on entrepreneurship will be held on March 12 at the Main Hall. All students are welcome.", date: "2026-03-01", author: "Dean of Students", priority: "medium", target: "all" },
  { id: "an4", title: "Library Hours Extended", content: "The library will now be open until 9:00 PM on weekdays to support exam preparation.", date: "2026-02-28", author: "Librarian", priority: "low", target: "all" },
];

export const mockTimetable: TimetableEntry[] = [
  { id: "t1", day: "Monday", time: "8:00 - 10:00", courseCode: "BBA201", courseName: "Financial Accounting II", room: "Block A, Rm 204", lecturer: "Dr. Kato James" },
  { id: "t2", day: "Monday", time: "14:00 - 15:30", courseCode: "BBA203", courseName: "Principles of Marketing", room: "Block A, Rm 305", lecturer: "Dr. Mugisha Allan" },
  { id: "t3", day: "Tuesday", time: "10:00 - 11:30", courseCode: "BBA202", courseName: "Business Statistics", room: "Block B, Rm 101", lecturer: "Ms. Atim Patricia" },
  { id: "t4", day: "Tuesday", time: "14:00 - 15:30", courseCode: "BBA205", courseName: "Human Resource Management", room: "Block B, Rm 203", lecturer: "Dr. Namutebi Rose" },
  { id: "t5", day: "Wednesday", time: "8:00 - 9:30", courseCode: "BBA204", courseName: "Business Law", room: "Block C, Rm 102", lecturer: "Mr. Okello David" },
  { id: "t6", day: "Wednesday", time: "8:00 - 10:00", courseCode: "BBA201", courseName: "Financial Accounting II", room: "Block A, Rm 204", lecturer: "Dr. Kato James" },
  { id: "t7", day: "Thursday", time: "10:00 - 11:30", courseCode: "BBA202", courseName: "Business Statistics", room: "Block B, Rm 101", lecturer: "Ms. Atim Patricia" },
  { id: "t8", day: "Thursday", time: "14:00 - 15:30", courseCode: "BBA205", courseName: "Human Resource Management", room: "Block B, Rm 203", lecturer: "Dr. Namutebi Rose" },
  { id: "t9", day: "Friday", time: "8:00 - 9:30", courseCode: "BBA204", courseName: "Business Law", room: "Block C, Rm 102", lecturer: "Mr. Okello David" },
  { id: "t10", day: "Friday", time: "14:00 - 15:30", courseCode: "BBA203", courseName: "Principles of Marketing", room: "Block A, Rm 305", lecturer: "Dr. Mugisha Allan" },
];

export const feeStructure = {
  totalFees: 3200000,
  paid: 1500000,
  balance: 1700000,
  currency: "UGX",
};

export const gpaData = {
  currentGPA: 3.67,
  cumulativeGPA: 3.54,
  totalCredits: 48,
  semesterCredits: 16,
  results: [
    { course: "BBA201", name: "Financial Accounting II", grade: "B+", points: 3.5, credits: 4 },
    { course: "BBA202", name: "Business Statistics", grade: "A-", points: 3.7, credits: 3 },
    { course: "BBA203", name: "Principles of Marketing", grade: "A", points: 4.0, credits: 3 },
    { course: "BBA204", name: "Business Law", grade: "B", points: 3.0, credits: 3 },
    { course: "BBA205", name: "Human Resource Management", grade: "A-", points: 3.7, credits: 3 },
  ],
};

export const adminStats = {
  totalStudents: 10247,
  totalLecturers: 186,
  totalCourses: 342,
  activeEnrollments: 9834,
  pendingPayments: 1247,
  approvedPayments: 8563,
  totalRevenue: 28500000000,
  collectionRate: 87.3,
};

export const enrollmentByDepartment = [
  { name: "Business Admin", students: 2840 },
  { name: "Information Tech", students: 2150 },
  { name: "Engineering", students: 1680 },
  { name: "Health Sciences", students: 1420 },
  { name: "Education", students: 1190 },
  { name: "Others", students: 967 },
];

export const monthlyRevenue = [
  { month: "Sep", revenue: 4200 },
  { month: "Oct", revenue: 3800 },
  { month: "Nov", revenue: 2100 },
  { month: "Dec", revenue: 1500 },
  { month: "Jan", revenue: 5800 },
  { month: "Feb", revenue: 6200 },
  { month: "Mar", revenue: 4900 },
];

export const lecturerCourses: Course[] = [
  { id: "lc1", code: "IT301", name: "Database Management Systems", lecturer: "Dr. Ssempala Robert", credits: 4, schedule: "Mon & Wed 10:00-12:00", room: "IT Lab 1" },
  { id: "lc2", code: "IT302", name: "Software Engineering", lecturer: "Dr. Ssempala Robert", credits: 3, schedule: "Tue & Thu 8:00-9:30", room: "Block D, Room 201" },
  { id: "lc3", code: "IT303", name: "Web Development", lecturer: "Dr. Ssempala Robert", credits: 3, schedule: "Fri 10:00-13:00", room: "IT Lab 2" },
];

export const lecturerStudentSubmissions = [
  { id: "ls1", studentName: "Nakamya Sarah", studentId: "BRI/2024/0451", assignment: "ER Diagram Design", course: "IT301", submittedDate: "2026-03-04", status: "submitted" as const, grade: null },
  { id: "ls2", studentName: "Tumwine Brian", studentId: "BRI/2024/0322", assignment: "ER Diagram Design", course: "IT301", submittedDate: "2026-03-03", status: "graded" as const, grade: 82 },
  { id: "ls3", studentName: "Achieng Diana", studentId: "BRI/2024/0198", assignment: "Requirements Spec", course: "IT302", submittedDate: "2026-03-05", status: "submitted" as const, grade: null },
  { id: "ls4", studentName: "Musoke Peter", studentId: "BRI/2024/0567", assignment: "ER Diagram Design", course: "IT301", submittedDate: null, status: "pending" as const, grade: null },
  { id: "ls5", studentName: "Namubiru Joy", studentId: "BRI/2024/0089", assignment: "React Portfolio", course: "IT303", submittedDate: "2026-03-06", status: "submitted" as const, grade: null },
];
