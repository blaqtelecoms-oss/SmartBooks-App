const MAX_SIDE = 256;

/** Centre-crops the chosen image to a square and returns a small data URL. */
export const toAvatarDataUrl = (file) =>
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
        resolve(canvas.toDataURL("image/jpeg", 0.85));
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
