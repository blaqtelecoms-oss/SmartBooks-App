const MAX_SIDE = 256;

/**
 * Centre-crops the chosen image to a square and returns it as a small JPEG blob.
 *
 * The photo is deliberately not returned as a data URL: user_metadata travels
 * inside every session token, so a base64 photo there inflates the token until
 * the Storage gateway rejects authenticated requests.
 */
export const toAvatarBlob = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read that image"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = MAX_SIDE;
        canvas.height = MAX_SIDE;
        canvas
          .getContext("2d")
          .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, MAX_SIDE, MAX_SIDE);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not read that image"))),
          "image/jpeg",
          0.85
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/** First letter of the account holder's name, used until a photo is uploaded. */
export const initialOf = (user) => {
  const name = (user?.full_name || "").trim();
  if (name) return name.charAt(0).toUpperCase();
  const email = (user?.email || "").trim();
  return email ? email.charAt(0).toUpperCase() : "U";
};

/** Human label for the account role, e.g. "accountant" -> "Accountant". */
export const roleLabelOf = (user) =>
  user?.role ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
