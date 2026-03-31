import http.server
import socketserver
import urllib.parse

class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Liste des routes propres issues du fichier _redirects
        spa_routes = [
            '/simulateur-net-brut', 
            '/rupture-cdi', 
            '/rupture-cdd', 
            '/depart-volontaire', 
            '/cotisations-cnss', 
            '/calcul-igr'
        ]
        
        parsed_path = urllib.parse.urlparse(self.path).path
        
        # Si c'est une route du simulateur, on sert app.html à la place
        if parsed_path in spa_routes:
            self.path = '/app.html'
            
        return super().do_GET()

if __name__ == '__main__':
    PORT = 8081
    print(f"🚀 Serveur SPA de développement lancé : http://localhost:{PORT}")
    print("Ce serveur simule le comportement de Netlify pour les URL propres.")
    with socketserver.TCPServer(("", PORT), SPARequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
