const detectDockerEnv = () => {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }

  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
};

export const isDocker = detectDockerEnv();

export const API_CONFIG = {
  secure: {
    name: "API Segura",
    url: "http://localhost:3001",
    wsUrl: isDocker ? "ws://app_secure:8081" : "ws://localhost:8081",
    color: "#10b981",
  },
  vulnerable: {
    name: "API Vulnerable",
    url: "http://localhost:3000",
    wsUrl: isDocker ? "ws://app_vulnerable:8081" : "ws://localhost:8082",
    color: "#ef4444",
  },
};
