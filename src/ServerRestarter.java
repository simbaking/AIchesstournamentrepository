import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.GZIPInputStream;

public class ServerRestarter {

    private static final int PORT = 3000;
    private static Process serverProcess;
    
    // OS Detection
    private static final String OS_NAME = System.getProperty("os.name").toLowerCase();
    private static final boolean IS_WINDOWS = OS_NAME.contains("win");
    private static final boolean IS_MAC = OS_NAME.contains("mac");
    private static final boolean IS_LINUX = OS_NAME.contains("nux") || OS_NAME.contains("nix");
    
    // Node.js version and download URLs
    private static final String NODE_VERSION = "18.16.0";
    private static final String NODE_DIR_NAME = getNodeDirName();
    private static final String NODE_DOWNLOAD_URL = getNodeDownloadUrl();
    
    private static String nodePath = null;
    private static String npmPath = null;

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════╗");
        System.out.println("║     Chess Server Setup & Restarter       ║");
        System.out.println("╚══════════════════════════════════════════╝");
        System.out.println("Operating System: " + System.getProperty("os.name"));
        System.out.println("Architecture: " + System.getProperty("os.arch"));
        System.out.println();

        try {
            // Step 1: Ensure Node.js is available
            if (!ensureNodeInstalled()) {
                System.err.println("FATAL: Could not set up Node.js. Exiting.");
                return;
            }

            // Step 2: Ensure npm dependencies are installed
            if (!ensureDependenciesInstalled()) {
                System.err.println("FATAL: Could not install dependencies. Exiting.");
                return;
            }

            // Step 3: Kill any existing server and start fresh
            killExistingServer();
            startServer();

            // Keep running for restart capability
            System.out.println("\n✓ Server started successfully!");
            System.out.println("Press Enter to restart, or Ctrl+C to exit.");
            
            BufferedReader consoleReader = new BufferedReader(new InputStreamReader(System.in));
            while (true) {
                String input = consoleReader.readLine();
                if (input != null) {
                    System.out.println("\nRestarting server...");
                    killExistingServer();
                    startServer();
                    System.out.println("✓ Server restarted. Press Enter to restart again.");
                }
            }

        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ==================== Node.js Setup ====================

    private static String getNodeDirName() {
        String arch = System.getProperty("os.arch").toLowerCase();
        boolean isArm = arch.contains("aarch64") || arch.contains("arm");
        
        if (IS_WINDOWS) {
            return "node-v" + NODE_VERSION + "-win-x64";
        } else if (IS_MAC) {
            return "node-v" + NODE_VERSION + "-darwin-" + (isArm ? "arm64" : "x64");
        } else {
            return "node-v" + NODE_VERSION + "-linux-x64";
        }
    }

    private static String getNodeDownloadUrl() {
        String base = "https://nodejs.org/dist/v" + NODE_VERSION + "/";
        String arch = System.getProperty("os.arch").toLowerCase();
        boolean isArm = arch.contains("aarch64") || arch.contains("arm");
        
        if (IS_WINDOWS) {
            return base + "node-v" + NODE_VERSION + "-win-x64.zip";
        } else if (IS_MAC) {
            String archSuffix = isArm ? "arm64" : "x64";
            return base + "node-v" + NODE_VERSION + "-darwin-" + archSuffix + ".tar.gz";
        } else {
            return base + "node-v" + NODE_VERSION + "-linux-x64.tar.gz";
        }
    }

    private static boolean ensureNodeInstalled() {
        System.out.println("[1/3] Checking for Node.js...");
        
        // Check local node_runtime first
        File nodeRuntimeDir = new File("node_runtime");
        File localNodeDir = new File(nodeRuntimeDir, NODE_DIR_NAME);
        
        String nodeExe = IS_WINDOWS ? "node.exe" : "bin/node";
        String npmExe = IS_WINDOWS ? "npm.cmd" : "bin/npm";
        
        File localNode = new File(localNodeDir, nodeExe);
        File localNpm = new File(localNodeDir, npmExe);
        
        if (localNode.exists()) {
            nodePath = localNode.getAbsolutePath();
            npmPath = localNpm.getAbsolutePath();
            System.out.println("  ✓ Found local Node.js: " + nodePath);
            return true;
        }
        
        // Check system PATH
        if (isCommandAvailable("node")) {
            nodePath = "node";
            npmPath = "npm";
            System.out.println("  ✓ Found Node.js in system PATH");
            return true;
        }
        
        // Need to download Node.js
        System.out.println("  ✗ Node.js not found. Downloading...");
        return downloadAndExtractNode(nodeRuntimeDir, localNodeDir);
    }

    private static boolean isCommandAvailable(String command) {
        try {
            ProcessBuilder pb;
            if (IS_WINDOWS) {
                pb = new ProcessBuilder("cmd.exe", "/c", "where", command);
            } else {
                pb = new ProcessBuilder("which", command);
            }
            Process p = pb.start();
            int exitCode = p.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean downloadAndExtractNode(File nodeRuntimeDir, File targetDir) {
        try {
            // Create node_runtime directory
            if (!nodeRuntimeDir.exists()) {
                nodeRuntimeDir.mkdirs();
            }

            String fileName = IS_WINDOWS ? "node.zip" : "node.tar.gz";
            File downloadFile = new File(nodeRuntimeDir, fileName);

            // Download
            System.out.println("  Downloading from: " + NODE_DOWNLOAD_URL);
            System.out.println("  This may take a few minutes...");
            
            downloadFile(NODE_DOWNLOAD_URL, downloadFile);
            System.out.println("  ✓ Download complete: " + formatSize(downloadFile.length()));

            // Extract
            System.out.println("  Extracting...");
            if (IS_WINDOWS) {
                extractZip(downloadFile, nodeRuntimeDir);
            } else {
                extractTarGz(downloadFile, nodeRuntimeDir);
            }
            System.out.println("  ✓ Extraction complete");

            // Clean up download file
            downloadFile.delete();

            // Verify
            String nodeExe = IS_WINDOWS ? "node.exe" : "bin/node";
            String npmExe = IS_WINDOWS ? "npm.cmd" : "bin/npm";
            File localNode = new File(targetDir, nodeExe);
            File localNpm = new File(targetDir, npmExe);

            if (localNode.exists()) {
                nodePath = localNode.getAbsolutePath();
                npmPath = localNpm.getAbsolutePath();
                
                // Make executable on Unix
                if (!IS_WINDOWS) {
                    localNode.setExecutable(true);
                    localNpm.setExecutable(true);
                }
                
                System.out.println("  ✓ Node.js installed successfully");
                return true;
            } else {
                System.err.println("  ✗ Node executable not found after extraction");
                return false;
            }

        } catch (Exception e) {
            System.err.println("  ✗ Failed to download/extract Node.js: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private static void downloadFile(String urlStr, File destination) throws IOException {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestProperty("User-Agent", "Mozilla/5.0");
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);

        long totalSize = conn.getContentLengthLong();

        try (InputStream in = conn.getInputStream();
             FileOutputStream out = new FileOutputStream(destination)) {
            
            byte[] buffer = new byte[8192];
            long downloaded = 0;
            int bytesRead;
            int lastProgress = 0;

            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
                downloaded += bytesRead;
                
                if (totalSize > 0) {
                    int progress = (int) ((downloaded * 100) / totalSize);
                    if (progress >= lastProgress + 10) {
                        System.out.print("  " + progress + "%...");
                        lastProgress = progress;
                    }
                }
            }
            System.out.println();
        }
    }

    private static void extractZip(File zipFile, File destDir) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                File file = new File(destDir, entry.getName());
                if (entry.isDirectory()) {
                    file.mkdirs();
                } else {
                    file.getParentFile().mkdirs();
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private static void extractTarGz(File tarGzFile, File destDir) throws IOException {
        // Use system tar command if available (much more reliable)
        try {
            ProcessBuilder pb = new ProcessBuilder("tar", "-xzf", tarGzFile.getAbsolutePath(), "-C", destDir.getAbsolutePath());
            pb.redirectErrorStream(true);
            Process p = pb.start();
            
            // Read output
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("  [tar] " + line);
                }
            }
            
            int exitCode = p.waitFor();
            if (exitCode == 0) {
                return; // Success
            }
        } catch (Exception e) {
            System.out.println("  System tar not available, using built-in extraction...");
        }
        
        // Fallback to Java-based extraction
        try (FileInputStream fis = new FileInputStream(tarGzFile);
             GZIPInputStream gzis = new GZIPInputStream(fis)) {
            extractTar(gzis, destDir);
        }
    }

    private static void extractTar(InputStream tarStream, File destDir) throws IOException {
        byte[] header = new byte[512];
        
        while (true) {
            int read = readFully(tarStream, header);
            if (read < 512) break;
            
            // Check for empty block (end of archive)
            boolean isEmpty = true;
            for (int i = 0; i < 512; i++) {
                if (header[i] != 0) {
                    isEmpty = false;
                    break;
                }
            }
            if (isEmpty) break;
            
            // Parse header
            String name = extractString(header, 0, 100);
            if (name.isEmpty()) break;
            
            char type = (char) header[156];
            long size = parseOctal(header, 124, 12);
            
            File outFile = new File(destDir, name);
            
            if (type == '5' || name.endsWith("/")) {
                // Directory
                outFile.mkdirs();
            } else if (type == '0' || type == 0) {
                // Regular file
                outFile.getParentFile().mkdirs();
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    long remaining = size;
                    byte[] buffer = new byte[8192];
                    while (remaining > 0) {
                        int toRead = (int) Math.min(buffer.length, remaining);
                        int bytesRead = tarStream.read(buffer, 0, toRead);
                        if (bytesRead < 0) break;
                        fos.write(buffer, 0, bytesRead);
                        remaining -= bytesRead;
                    }
                }
                
                // Skip padding to 512-byte boundary
                long padding = (512 - (size % 512)) % 512;
                tarStream.skip(padding);
            } else if (type == '2') {
                // Symbolic link - skip on Windows, create on Unix
                if (!IS_WINDOWS) {
                    String linkTarget = extractString(header, 157, 100);
                    try {
                        Files.createSymbolicLink(outFile.toPath(), Paths.get(linkTarget));
                    } catch (Exception e) {
                        // Ignore symlink errors
                    }
                }
            } else {
                // Skip other types
                long blocks = (size + 511) / 512;
                tarStream.skip(blocks * 512);
            }
        }
    }

    private static int readFully(InputStream in, byte[] buffer) throws IOException {
        int offset = 0;
        while (offset < buffer.length) {
            int read = in.read(buffer, offset, buffer.length - offset);
            if (read < 0) break;
            offset += read;
        }
        return offset;
    }

    private static String extractString(byte[] buffer, int offset, int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            byte b = buffer[offset + i];
            if (b == 0) break;
            sb.append((char) b);
        }
        return sb.toString().trim();
    }

    private static long parseOctal(byte[] buffer, int offset, int length) {
        long result = 0;
        for (int i = 0; i < length; i++) {
            byte b = buffer[offset + i];
            if (b == 0 || b == ' ') break;
            if (b >= '0' && b <= '7') {
                result = result * 8 + (b - '0');
            }
        }
        return result;
    }

    private static String formatSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        return String.format("%.1f MB", bytes / (1024.0 * 1024));
    }

    // ==================== Dependencies Setup ====================

    private static boolean ensureDependenciesInstalled() {
        System.out.println("[2/3] Checking npm dependencies...");
        
        File nodeModules = new File("web" + File.separator + "node_modules");
        File packageJson = new File("web" + File.separator + "package.json");
        
        if (!packageJson.exists()) {
            System.err.println("  ✗ web/package.json not found!");
            return false;
        }
        
        if (nodeModules.exists() && nodeModules.isDirectory()) {
            // Check if express exists (main dependency)
            File express = new File(nodeModules, "express");
            if (express.exists()) {
                System.out.println("  ✓ Dependencies already installed");
                return true;
            }
        }
        
        System.out.println("  Installing dependencies (npm install)...");
        return runNpmInstall();
    }

    private static boolean runNpmInstall() {
        try {
            ProcessBuilder pb;
            if (IS_WINDOWS) {
                pb = new ProcessBuilder("cmd.exe", "/c", npmPath, "install");
            } else {
                pb = new ProcessBuilder(npmPath, "install");
            }
            
            pb.directory(new File("web"));
            pb.redirectErrorStream(true);
            
            // Add node to PATH
            if (nodePath != null && !nodePath.equals("node")) {
                String nodeBin = new File(nodePath).getParent();
                String currentPath = pb.environment().getOrDefault("PATH", "");
                pb.environment().put("PATH", nodeBin + File.pathSeparator + currentPath);
            }
            
            Process process = pb.start();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("  [npm] " + line);
                }
            }
            
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                System.out.println("  ✓ Dependencies installed successfully");
                return true;
            } else {
                System.err.println("  ✗ npm install failed with exit code: " + exitCode);
                return false;
            }
            
        } catch (Exception e) {
            System.err.println("  ✗ Failed to run npm install: " + e.getMessage());
            return false;
        }
    }

    // ==================== Server Management ====================

    private static void killExistingServer() {
        System.out.println("[3/3] Checking for existing server on port " + PORT + "...");
        try {
            List<String> pids = new ArrayList<>();

            if (IS_WINDOWS) {
                ProcessBuilder pb = new ProcessBuilder("cmd.exe", "/c", 
                    "netstat -ano | findstr :" + PORT);
                Process netstat = pb.start();
                BufferedReader reader = new BufferedReader(new InputStreamReader(netstat.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.contains(":" + PORT) && line.contains("LISTENING")) {
                        String[] parts = line.split("\\s+");
                        if (parts.length >= 5) {
                            String pid = parts[parts.length - 1];
                            if (!pids.contains(pid) && !pid.equals("0")) {
                                pids.add(pid);
                            }
                        }
                    }
                }
                netstat.waitFor();

                for (String pid : pids) {
                    System.out.println("  Killing process " + pid);
                    new ProcessBuilder("taskkill", "/F", "/PID", pid).start().waitFor();
                }
            } else {
                ProcessBuilder pb = new ProcessBuilder("lsof", "-t", "-i:" + PORT);
                Process lsof = pb.start();
                BufferedReader reader = new BufferedReader(new InputStreamReader(lsof.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.trim().isEmpty()) {
                        pids.add(line.trim());
                    }
                }
                lsof.waitFor();

                for (String pid : pids) {
                    System.out.println("  Killing process " + pid);
                    new ProcessBuilder("kill", "-9", pid).start().waitFor();
                }
            }

            if (!pids.isEmpty()) {
                System.out.println("  ✓ Previous server stopped");
                Thread.sleep(1000); // Wait for port to be released
            } else {
                System.out.println("  ✓ No existing server found");
            }

        } catch (Exception e) {
            System.err.println("  Warning: " + e.getMessage());
        }
    }

    private static void startServer() throws IOException {
        System.out.println("  Starting Node.js server...");

        String serverPath = "web" + File.separator + "server.js";

        ProcessBuilder pb;
        if (IS_WINDOWS) {
            pb = new ProcessBuilder("cmd.exe", "/c", nodePath, serverPath);
        } else {
            pb = new ProcessBuilder(nodePath, serverPath);
        }
        
        pb.directory(new File("."));
        pb.redirectErrorStream(true);

        // Add node to PATH
        if (nodePath != null && !nodePath.equals("node")) {
            String nodeBin = new File(nodePath).getParent();
            String currentPath = pb.environment().getOrDefault("PATH", "");
            pb.environment().put("PATH", nodeBin + File.pathSeparator + currentPath);
        }

        serverProcess = pb.start();

        // Output reader thread
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(serverProcess.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("[SERVER] " + line);
                }
            } catch (IOException e) {
                // Process ended
            }
        }).start();

        // Wait a moment and check if server started
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {}
        
        if (!serverProcess.isAlive()) {
            throw new IOException("Server process terminated unexpectedly");
        }
    }
}
