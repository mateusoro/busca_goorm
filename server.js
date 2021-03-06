  
var url = require('url');
var magnet = require("magnet-uri");
const cheerio = require('cheerio');
var request = require('then-request');
var express = require('express');
var sleep = require('system-sleep');
const stringifyObject = require('stringify-object');
var app = express();

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'banco.db', autoload: true });


const Magnet2torrent = require('magnet2torrent-js');

// https://github.com/ngosang/trackerslist
const trackers = [
    'udp://tracker.coppersurfer.tk:6969/announce',
    'udp://tracker.open-internet.nl:6969/announce',
    'udp://tracker.leechers-paradise.org:6969/announce'    
];

var quantidade = 0;


function lista(tipo, ini, tamanho) {

    for (i = ini; i < (ini + tamanho); i++) {

        var p = tipo + i;
        l(p);
        var res = request('GET', p).done(function (res) {
          var data = res.getBody('utf8');
          const $ = cheerio.load(data);
          var titulos = $('.list-inline > li');
          titulos.each(function (index, elem) {

              var link = $(this).find('a')[0].attribs.href;
              var dublado = $(this).find('.idioma_lista').text().trim();

              if (dublado == "Dublado") {
                  l(link);                  
                  retorno_carregar_links(link);
              }
          });          
        });
        
    }

}
var encontrado = 0;
function retorno_carregar_links(p) {

      var res = request('GET', p).done(function (res) {
        const $ = cheerio.load(res.getBody('utf8'));      
        $("a[href*='magnet:?xt=urn']").each(function (index, elem) {
            
            try{                
                var mag = this.attribs.href;                
                var parsed = magnet(mag);                        
               
				if(quantidade > 10){
					l('Esperando: Fila de Torrent');
				}else{
					sleep(200);
				}
				while(quantidade > 10){								
					sleep(1000);
				}
				
				db.find({ hash: parsed.infoHash }, function (err, docs) {
  					if(err){
						  console.log(err);
					  }else{
						  //console.log(docs);
						  if(docs.length > 0){
							  encontrado++;
							 l('Já Encontrado:'+encontrado+' '+parsed.infoHash);
					      }else{							  
							  add_torrent(mag);
						  }
					  }
				});
                 
                //}

            }catch(e){
              l(mag);
              console.log('Erro')
            }

        });
    });

}
var liberado = 0;
function add_torrent(mag, time=20){
    
  	quantidade++;
	const m2t = new Magnet2torrent({
					trackers,
					addTrackersToTorrent: true,
					timeout: time 
				});
	
  	m2t.getTorrent(mag).then(torrent => {
      
      var arquivos = {}
      for(var a in torrent.files){
        arquivos[a] = torrent.files[a].name;
      }
      liberado++;     
	  db.insert({hash:torrent.infoHash, arquivos: stringifyObject(arquivos) }, function (err, newDoc) {   
		  if(err){
			console.log(err);
		  }else{
			l('Liberado: '+liberado+" "+torrent.infoHash);  
		  }
		});
      
      //l(arquivos);
      quantidade--;

  	}).catch(e => {
      // Timeout or error occured
      	quantidade--;
		var parsed = magnet(mag);    
      	console.error(e+" "+time+" "+parsed.infoHash);
	  	if(time==20){
			db.find({ hash: parsed.infoHash }, function (err, docs) {
  					if(err){
						  console.log(err);
					  }else{
						  //console.log(docs);
						  if(docs.length > 0){
							  encontrado++;
							 l('Já Encontrado:'+encontrado+' '+parsed.infoHash);
					      }else{							  
							  add_torrent(mag, 60);
						  }
					  }
			});
		}
	  
	});
    


}
function add_hash(hash, time=20){
    
  	quantidade++;
	const m2t = new Magnet2torrent({
					trackers,
					addTrackersToTorrent: true,
					timeout: time 
				});
	
  	m2t.getTorrent("magnet:?xt=urn:btih:"+hash).then(torrent => {
      
      var arquivos = {}
      for(var a in torrent.files){
        arquivos[a] = torrent.files[a].name;
      }
      liberado++;     
	  db.insert({hash:torrent.infoHash, arquivos: stringifyObject(arquivos) }, function (err, newDoc) {   
		  if(err){
			console.log(err);
		  }else{
			l('Liberado: '+liberado+" "+torrent.infoHash);  
		  }
		});
      
      //l(arquivos);
      quantidade--;

  	}).catch(e => {
      // Timeout or error occured
      	quantidade--;		  
      	console.error(e+" "+time+" "+hash);
	  	if(time==20){
			db.find({ hash: hash }, function (err, docs) {
  					if(err){
						  console.log(err);
					  }else{
						  //console.log(docs);
						  if(docs.length > 0){
							  encontrado++;
							 l('Já Encontrado:'+encontrado+' '+hash);
					      }else{							  
							  add_hash(hash, 60);
						  }
					  }
			});
		}
	  
	});
    


}
app.get('/carregado', function(req, res){	
	db.find({ hash: req.query.hash }, function (err, docs) {
		if(err){
			  console.log(err);
		  }else{
			  //console.log(docs);
			  if(docs.length > 0){
				  l(docs[0].arquivos);
				  var text1 = stringifyObject(docs[0].arquivos,{
																	indent: '  ',
																	singleQuotes: false
																});
				 res.send("<html>"+text1+"</html>"); 
			  }else{
				 add_hash(req.query.hash);
				 res.send("<html>Não Carregado</html>");	
			  }
		  }
	});	
});
app.get('/', function(req, res){	
	
	res.send("<html>Rodando</html>");
	lista('https://ondeeubaixo.net/-',1,5)
	
});
app.get('/lancamentos', function(req, res){	
	
	res.send("<html>Rodando</html>");
	lista('https://ondeeubaixo.net/lancamentos-',1,4)
	
});


function l(log) {
    console.log(log);
}
var porta = process.env.PORT || 3000;
app.listen(porta);
console.log("Porta",porta);