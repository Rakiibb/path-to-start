import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type UserRow = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

export type Feedback = Tables<"feedback">;
export type FeedbackInsert = TablesInsert<"feedback">;
export type FeedbackUpdate = TablesUpdate<"feedback">;

export type FeedbackVote = Tables<"feedback_votes">;
export type FeedbackVoteInsert = TablesInsert<"feedback_votes">;

export type SosRequest = Tables<"sos_requests">;
export type SosRequestInsert = TablesInsert<"sos_requests">;
export type SosRequestUpdate = TablesUpdate<"sos_requests">;

export type Notification = Tables<"notifications">;

export type SchoolRule = Tables<"school_rules">;
export type SchoolRuleInsert = TablesInsert<"school_rules">;
export type SchoolRuleUpdate = TablesUpdate<"school_rules">;

export type SeatStudent = Tables<"seat_students">;
export type SeatStudentInsert = TablesInsert<"seat_students">;
export type SeatStudentUpdate = TablesUpdate<"seat_students">;

export type Role = "student" | "captain";
export type FeedbackStatus = "Pending" | "Verified" | "Rejected";
export type SosStatus = "Active" | "Resolved";
