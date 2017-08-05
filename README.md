# postgrest-auth

`postgrest-auth` is an authorization server for [PostgREST](https://github.com/begriffs/postgrest) written in [Node.js](https://github.com/nodejs/node).

It provides the following endpoints:

```
POST /auth/users # create a new user and responds with an "access_token"

POST /auth/refresh_token # returns a new access_token

POST /auth/change_password # changes a user's password and returns a new access_token

POST /auth/change_email # changes a user's email

POST /auth/forgot_password # emails a reset_token that can be used to change password

POST /auth/forgot_username # emails the user his or her username
```

#### Setup
Install `postgrest-auth`:

```
npm i -g postgrest-auth
```

`postgrest-auth` requires a `users` table and an `auth` schema to work. Run the following queries:

```
CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id serial PRIMARY KEY,
  username varchar(20) NOT NULL UNIQUE,
  username_lowercase varchar(20) NOT NULL UNIQUE,
  email text UNIQUE,
  password text NOT NULL,
  token_count integer NOT NULL DEFAULT 0
);
```

`postgrest-auth` uses a `web_anon` role for unauthenticated users and a `normal_user` role for users that are authenticated.

```
CREATE ROLE web_anon, normal_user;

GRANT USAGE ON SCHEMA auth TO web_anon, normal_user;
```

You must also specify the anonymous role in your `postgrest.conf` file.

```
db-anon-role = "web_anon"
```

To invalidate unexpired or stolen tokens, `postgrest-auth` uses the [token count strategy](https://stackoverflow.com/a/24235103). Execute the following queries:

```
GRANT SELECT (username_lowercase, token_count) ON auth.users TO web_anon;

CREATE OR REPLACE FUNCTION auth.check_token() RETURNS void
  language plpgsql
  as $$
begin
  if current_setting('request.jwt.claim.count', true) IS NOT NULL then
    if current_setting('request.jwt.claim.count', true)::int !=
       (SELECT token_count
       FROM auth.users
       WHERE username_lowercase = current_user) then
         raise invalid_password using hint = 'Count invalid';
    end if;
  end if;
end
$$;
```
Also, update your `postgrest.conf` to add the `auth.check_token()` function to the `pre-request` field.

```
pre-request = "auth.check_token"
```

Lastly, `postgrest-auth` uses a `postgrest-auth.json` file to know how to connect to postgres and the email account that will send emails when users signup, forget their passwords, forget their usernames, etc. You will have to change `postgrest-auth.json` example below to work with your application configuration.

```
// postgrest-auth.json example
{
  "app_name": "A Game of Theories", // used in email signature
  "db": {
    "connection": {
      "host": "localhost",
      "port": 5432,
      "database": "postgres",
      "user": "postgres",
      "password": "pass"
    },
    "connection_string": "postgres://postgres:pass@localhost/postgres",
    "pool": {
      "min": 2,
      "max": 10
    },
    "schema": "auth",
    "table": "users"
  },
  "email": {
    "from": "contact@agameoftheories.com",
    "host": "mail.privateemail.com",
    "port": 465,
    "secure": true,
    "auth": {
        "user": "contact@agameoftheories.com",
        "pass": "thepassword"
    }
  },
  "payload": {
    "exp": 604800,
    "iss": "https://agameoftheories.com"
  },
  "port": 3001,
  "roles": {
    "anonymous": "web_anon",
    "user": "normal_user"
  },
  "secret": "secret" // jwt secret
}
```

Once you have created the `postgrest-auth.json` file, start the `postgrest-auth` server.

```
postgrest-auth --config postgrest-auth.json
```
