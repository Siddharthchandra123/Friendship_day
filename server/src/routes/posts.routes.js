const express=require("express");

const router=express.Router();

const auth=require("../middleware/auth");

const controller=

require(

"../controllers/posts.controller"

);

router.get(

"/",

controller.getPosts

);

router.post(

"/",

auth,

controller.createPost

);

router.delete(

"/:id",

auth,

controller.deletePost

);

router.post(

"/:id/like",

auth,

controller.toggleLike

);

module.exports=router;