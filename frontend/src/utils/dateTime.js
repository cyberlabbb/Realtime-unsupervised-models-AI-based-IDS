export const formatVNDateTime = (input) => {
  if (!input) return "N/A";

  try {
    const timestamp = input.$date ? new Date(input.$date) : new Date(input);

    // Trừ 7 giờ vì thời gian MongoDB đã là GMT+7
    const adjusted = new Date(timestamp.getTime());

    const pad = (n) => n.toString().padStart(2, "0");

    return `${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}:${pad(
      adjusted.getSeconds()
    )} ${pad(adjusted.getDate())}/${pad(
      adjusted.getMonth() + 1
    )}/${adjusted.getFullYear()}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};
