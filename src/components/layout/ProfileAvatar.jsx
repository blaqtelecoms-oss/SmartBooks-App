import React from "react";
import { Link } from "react-router-dom";
import { initialOf } from "@/lib/avatar";

/**
 * Top-bar account avatar. Shows the uploaded photo, otherwise the first letter of
 * the account holder's name, and links straight to the profile page.
 */
export default function ProfileAvatar({ user }) {
  return (
    <Link
      to="/profile"
      className="sb-avatar sb-avatar-btn"
      aria-label="Open profile"
      title={user?.full_name || "Profile"}
    >
      {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initialOf(user)}
    </Link>
  );
}
