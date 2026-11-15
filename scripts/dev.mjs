import http from 'node:http';
import { createServer, loadEnv } from 'vite';
Object.assign(process.env,loadEnv('development',process.cwd(),''));
const { default:handler }=await import('../api/blog.js');
const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
const server=http.createServer(async(req,res)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/api/blog')return vite.middlewares(req,res);
  res.status=code=>{res.statusCode=code;return res;};
  res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
  res.send=data=>res.end(data);
  try {
    let size=0;const chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>4.4*1024*1024)throw new Error('Request is too large.');chunks.push(chunk);}
    req.body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
    await handler(req,res);
  }catch(error){if(!res.writableEnded)res.status(400).json({error:error.message});}
});
server.listen(5175,'127.0.0.1',()=>console.log('Portfolio and blog preview: http://127.0.0.1:5175/'));
const stop=()=>{server.close();vite.close().finally(()=>process.exit(0));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
