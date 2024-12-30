import { getNims, pullNim, stopNim } from "@/services/api"; // Corrected import

const NimManagement = () => {
  const handleFetchNims = async () => {
    try {
      const nims = await getNims();
      console.log("Fetched NIMs:", nims);
    } catch (error) {
      console.error("Error fetching NIMs:", error);
    }
  };

  const handlePullNim = async (imageName: string) => {
    try {
      const nim = await pullNim(imageName);
      console.log("Pulled NIM:", nim);
    } catch (error) {
      console.error("Error pulling NIM:", error);
    }
  };

  const handleStopNim = async () => {
    try {
      await stopNim();
      console.log("Stopped active NIM");
    } catch (error) {
      console.error("Error stopping NIM:", error);
    }
  };

  return (
    <div>
      <h2>NIM Management</h2>
      <button onClick={handleFetchNims}>Fetch NIMs</button>
      <button onClick={() => handlePullNim("dummy-image")}>Pull NIM</button>
      <button onClick={handleStopNim}>Stop NIM</button>
    </div>
  );
};

export default NimManagement;

