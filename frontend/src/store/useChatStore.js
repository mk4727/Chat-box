import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        const unseenMessages = res.data.filter(
          (msg) => msg.receiverId === authUser._id && !msg.seen
        );
        if (unseenMessages.length > 0) {
          try {
            await axiosInstance.post("/messages/mark-seen", {
              messageIds: unseenMessages.map((msg) => msg._id),
            });
            set((state) => ({
              messages: state.messages.map((msg) =>
                unseenMessages.some((um) => um._id === msg._id)
                  ? { ...msg, seen: true }
                  : msg
              ),
            }));
          } catch (error) {
            console.warn("Mark-seen endpoint not found, using local state:", error.message);
            set((state) => ({
              messages: state.messages.map((msg) =>
                unseenMessages.some((um) => um._id === msg._id)
                  ? { ...msg, seen: true }
                  : msg
              ),
            }));
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
        ...messageData,
        seen: false,
      });
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error sending message");
    }
  },

  sendPDF: async (pdfFile) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    set({ isMessagesLoading: true }); // Add loading state
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await axiosInstance.post(`/messages/send-pdf/${selectedUser._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error sending PDF");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendImage: async (imageFile) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    set({ isMessagesLoading: true }); // Add loading state
    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await axiosInstance.post(`/messages/send-image/${selectedUser._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error sending image");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    if (!socket || !authUser) {
      console.error("Socket or authUser not available");
      return;
    }

    socket.on("newMessage", (newMessage) => {
      const isMessageForCurrentChat =
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id;

      if (isMessageForCurrentChat) {
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

        if (newMessage.receiverId === authUser._id && !newMessage.seen) {
          axiosInstance
            .post("/messages/mark-seen", { messageIds: [newMessage._id] })
            .then(() => {
              set((state) => ({
                messages: state.messages.map((msg) =>
                  msg._id === newMessage._id ? { ...msg, seen: true } : msg
                ),
              }));
              socket.emit("messageSeen", { ...newMessage, seen: true });
            })
            .catch((error) => {
              console.warn("Mark-seen endpoint not found, using local state:", error.message);
              set((state) => ({
                messages: state.messages.map((msg) =>
                  msg._id === newMessage._id ? { ...msg, seen: true } : msg
                ),
              }));
            });
        }
      }
    });

    socket.on("messageSeen", (updatedMessage) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? { ...msg, seen: true } : msg
        ),
      }));
    });

    return () => {
      socket.off("newMessage");
      socket.off("messageSeen");
    };
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageSeen");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));