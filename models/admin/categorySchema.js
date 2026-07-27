import mongoose, { STATES } from "mongoose";

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    image:{
        url:{
            type:String,
            default:""
        },
        public_id:{
            type:String,
            default:""
        }
    },  
    description:{
        type:String,
        default:""
    },
    status:{
        type: String,
        enum:["active", "inactive"],
        default:"active"
    },
    isDelete:{
        type: Boolean,
        default: false
    }
}, {timestamps:true});

const Category = mongoose.model("Category", categorySchema);

export default Category;