import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class ServerRestarter {

    private static final int PORT = 3000;
    private static Process serverProcess;

    public static void main(String[] args) {
        System.out.println("Server Restarter Tool");
        System.out.println("---------------------");

        try {
            killExistingServer();
            startServer();

            // Keep the program running to monitor or listen for user input to restart again if needed
            // For now, it just restarts once and streams output.
            // A more advanced version could listen for a keypress to restart again.
            
            System.out.println("Server started. Press Enter to restart again, or Ctrl+C to exit.");
            BufferedReader consoleReader = new BufferedReader(new InputStreamReader(System.in));
            while (true) {
                String input = consoleReader.readLine();
                if (input != null) {
                    System.out.println("Restarting server...");
                    killExistingServer(); // Kill the one we just started
                    startServer();
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void killExistingServer() {
        System.out.println("Checking for process on port " + PORT + "...");
        try {
            // Find PID using lsof
            ProcessBuilder pb = new ProcessBuilder("lsof", "-t", "-i:" + PORT);
            Process lsof = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(lsof.getInputStream()));
            String line;
            List<String> pids = new ArrayList<>();
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    pids.add(line.trim());
                }
            }
            lsof.waitFor();

            if (!pids.isEmpty()) {
                for (String pid : pids) {
                    System.out.println("Killing process " + pid);
                    new ProcessBuilder("kill", "-9", pid).start().waitFor();
                }
                System.out.println("Previous server stopped.");
            } else {
                System.out.println("No running server found on port " + PORT + ".");
            }

        } catch (Exception e) {
            System.err.println("Error killing server: " + e.getMessage());
        }
    }

    private static void startServer() throws IOException {
        System.out.println("Starting Node.js server...");
        // Use bash -l -c to run node so it loads the user's PATH (e.g. nvm, homebrew)
        ProcessBuilder pb = new ProcessBuilder("bash", "-l", "-c", "node web/server.js");
        pb.directory(new File(".")); // Run from current directory
        pb.redirectErrorStream(true); // Merge stderr into stdout
        
        serverProcess = pb.start();

        // Start a thread to read the output
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(serverProcess.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("[SERVER] " + line);
                }
            } catch (IOException e) {
                // Process likely ended
            }
        }).start();
    }
}
