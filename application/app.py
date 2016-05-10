#!/usr/bin/env python

import webapp2
from webapp2 import Route, BaseHandlerAdapter
from controllers.base import BaseRequestHandler

# Import the helper functions
from identitytoolkit import gitkitclient

# Import the configuration file you downloaded from Google Developer Console
gitkit_instance = gitkitclient.GitkitClient.FromConfigFile('gitkit-server-config.json')

from secrets import SESSION_KEY
# webapp2 config
app_config = {
  'webapp2_extras.sessions': {
    'cookie_name': '_gitkit_',
    'secret_key': SESSION_KEY
  },
  'webapp2_extras.auth': {
    'user_attributes': []
  }
}


class Webapp2HandlerAdapter(BaseHandlerAdapter):
  def __call__(self, request, response, exception):
    request.route_args = {}
    request.route_args['exception'] = exception
    handler = self.handler(request, response)

    return handler.get()


class MainHandler(BaseRequestHandler):
  def get(self):
    self.render('index.html')

class IO2016Handler(BaseRequestHandler):
  def get(self):
    self.render('io2016.html')


class Handle404(BaseRequestHandler):
  def get(self):
    self.render("error.html", **{'exception': self.request.route_args['exception']})


routes = [
  ('/', MainHandler),
  ('/io2016', IO2016Handler),
  # Route('/signin', handler="controllers.base.GitkitHandler:_on_sign", name="auth_sign"),
  # Route('/logout', handler="controllers.base.GitkitHandler:logout", name="logout"),
  # Route('/widget', handler="controllers.base.GitkitHandler:_widget", name="auth_widget")
]

router = webapp2.WSGIApplication(routes, config=app_config, debug=True)

router.error_handlers[404] = Webapp2HandlerAdapter(Handle404)