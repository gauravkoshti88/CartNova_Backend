import mongoose from "mongoose";

const loginOtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Automatically delete expired OTP documents
loginOtpSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  },
);

const LoginOtp = mongoose.model("LoginOtp", loginOtpSchema);

export default LoginOtp;
