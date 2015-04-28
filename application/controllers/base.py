# -*- encoding: utf-8 -*-

import webapp2
import logging
from webapp2_extras import auth, sessions, jinja2
from jinja2.runtime import TemplateNotFound


# Import the helper functions
from identitytoolkit import gitkitclient

# Import the configuration file you downloaded from Google Developer Console
gitkit_instance = gitkitclient.GitkitClient.FromConfigFile('gitkit-server-config.json')


class BaseRequestHandler(webapp2.RequestHandler):
  def dispatch(self):
    # Get a session store for this request.
    self.session_store = sessions.get_store(request=self.request)

    try:
      # Dispatch the request.
      webapp2.RequestHandler.dispatch(self)
    finally:
      # Save all sessions.
      self.session_store.save_sessions(self.response)

  @webapp2.cached_property
  def jinja2(self):
    """Returns a Jinja2 renderer cached in the app registry"""
    return jinja2.get_jinja2(app=self.app)

  @webapp2.cached_property
  def session(self):
    """Returns a session using the default cookie key"""
    return self.session_store.get_session()

  @webapp2.cached_property
  def auth(self):
    return auth.get_auth()

  @webapp2.cached_property
  def current_user(self):
    """Returns currently logged in user"""
    user_dict = self.auth.get_user_by_session()
    return self.auth.store.user_model.get_by_id(user_dict['user_id'])

  @webapp2.cached_property
  def logged_in(self):
    """Returns true if a user is currently logged in, false otherwise"""
    return self.auth.get_user_by_session() is not None

  def render(self, template_name, **template_vars):
    # Preset values for the template
    values = {}

    if self.logged_in:
      if self.current_user:
        values.update({'current_user': self.current_user})

    values.update(template_vars)
    try:
      self.response.write(self.jinja2.render_template(template_name, **values))
    except TemplateNotFound:
      self.abort(404)


class GitkitHandler(BaseRequestHandler):
  USER_ATTRS = {
    'email': 'email',
    'name': 'name',
    'photo_url': 'photo_url'
  }

  def _on_sign(self):

    if 'gtoken' in self.request.cookies:
      gitkit_user = gitkit_instance.VerifyGitkitToken(self.request.cookies['gtoken'])
      if gitkit_user:
        logging.debug('Get gitkit user: %s', gitkit_user)

        auth_id = '%s:%s' % (gitkit_user.provider_id, gitkit_user.user_id)
        logging.debug('Looking for a user with id %s', auth_id)

        data = gitkit_instance.GetUserById(gitkit_user.user_id)

        user = self.auth.store.user_model.get_by_auth_id(auth_id)
        _attrs = self._to_user_model_attrs(data, self.USER_ATTRS)

        if user:
          logging.debug('Found existing user to log in')
          # Existing users might've changed their profile data so we update our
          # local model anyway. This might result in quite inefficient usage
          # of the Datastore, but we do this anyway for demo purposes.
          #
          # In a real app you could compare _attrs with user's properties fetched
          # from the datastore and update local user in case something's changed.
          user.populate(**_attrs)
          user.put()
          self.auth.set_session(self.auth.store.user_to_dict(user))

        else:
          # check whether there's a user currently logged in
          # then, create a new user if nobody's signed in,
          # otherwise add this auth_id to currently logged in user.

          if self.logged_in:
            logging.debug('Updating currently logged in user')

            u = self.current_user
            u.populate(**_attrs)
            # The following will also do u.put(). Though, in a real app
            # you might want to check the result, which is
            # (boolean, info) tuple where boolean == True indicates success
            # See webapp2_extras.appengine.auth.models.User for details.
            u.add_auth_id(auth_id)

          else:
            logging.debug('Creating a brand new user')
            ok, user = self.auth.store.user_model.create_user(auth_id, **_attrs)
            if ok:
              self.auth.set_session(self.auth.store.user_to_dict(user))

    destination_url = '/'
    return self.redirect(destination_url)

  def logout(self):
    self.auth.unset_session()
    self.redirect('/')

  def handle_exception(self, exception, debug):
    logging.error(exception)
    self.render('error.html', **{'exception': exception})

  def _to_user_model_attrs(self, data, attrs_map):
    """Get the needed information from the provider dataset."""
    user_attrs = {}
    for k, v in attrs_map.iteritems():
      attr = (v, vars(data).get(k)) if isinstance(v, str) else v(vars(data).get(k))
      user_attrs.setdefault(*attr)

    return user_attrs

  def _widget(self):
    self.render('widget.html')