require 'rubygems'
require 'google/api_client'
require 'google/api_client/client_secrets'
require 'google/api_client/auth/file_storage'
require 'sinatra'
require 'logger'
require 'net/http'
require 'sinatra/activerecord'
require './config/environments' #database configuration
require './models/time_sheets'  #TimeSheets
require 'openssl'

enable :sessions

def api_client; settings.api_client; end

def calendar_api; settings.calendar; end

def user_credentials
  # Build a per-request oauth credential based on token stored in session
  # which allows us to use a shared API client.
  @authorization ||= (
    auth = api_client.authorization.dup
    auth.redirect_uri = to('/oauth2callback')
    auth.update_token!(session)
    auth
  )
end

configure do
  client = Google::APIClient.new(
    :application_name => 'Ruby Calendar sample',
    :application_version => '1.0.0')
  secrets = {"web"=>
    {"auth_uri"=>"https://accounts.google.com/o/oauth2/auth", 
    "client_secret"=>ENV["tap_client_secret"], 
    "token_uri"=>"https://accounts.google.com/o/oauth2/token", 
    "redirect_uris"=>ENV["tap_redirect_uris"].split("::"), 
    "client_id"=>ENV["tap_client_id"], 
    "javascript_origins"=>ENV["tap_javascript_origins"].split("::")
    }
  }
  client_secrets = Google::APIClient::ClientSecrets.new(secrets)
  client.authorization = client_secrets.to_authorization
  client.authorization.scope = 'https://www.googleapis.com/auth/calendar'
  # Since we're saving the API definition to the settings, we're only retrieving
  # it once (on server start) and saving it between requests.
  # If this is still an issue, you could serialize the object and load it on
  # subsequent runs.
  calendar = client.discovered_api('calendar', 'v3')
  set :api_client, client
  set :calendar, calendar
end



get '/oauth2authorize' do
  # Request authorization
  redirect user_credentials.authorization_uri.to_s, 303
end

get '/oauth2callback' do
  # Exchange token
  user_credentials.code = params[:code] if params[:code]
  begin
    user_credentials.fetch_access_token! 
    session[:access_token] = user_credentials.access_token
    session[:refresh_token] = user_credentials.refresh_token
    session[:expires_in] = user_credentials.expires_in
    session[:issued_at] = user_credentials.issued_at
    redirect to('/')
  rescue
    redirect to('/error')
  end
end

get '/' do
  # Fetch list of events on the user's default calandar
  if session[:access_token] != nil and JSON.parse(Net::HTTP.get(URI.parse("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + session[:access_token]))).has_key?("error")
    session.delete("access_token")
    session.delete("refresh_token")
    session.delete("expires_in")
    session.delete("issued_at")
  end
  unless user_credentials.access_token 
    redirect to('/oauth2authorize')
  else
    result = api_client.execute(:api_method => calendar_api.events.list,
                              :parameters => {'calendarId' => 'primary'},
                              :authorization => user_credentials)
    @email = JSON.parse(result.data.to_json)["summary"]
    startTime = DateTime.parse(Time.new.beginning_of_day.days_ago(7).to_s) 
    endTime = DateTime.parse(Time.new.end_of_day.to_s)
    result = api_client.execute(:api_method => calendar_api.events.list,
                              :parameters => {'calendarId' => 'primary', 'timeMin' => startTime, 'timeMax' => endTime, 'singleEvents' => true},
                              :authorization => user_credentials)
    @json = result.data.to_json
    request_email = @email
    if @email.casecmp("mikeaboody@gmail.com") == 0 or @email.casecmp("janine.harper@controlgroup.com") == 0 or @email.casecmp("michael.aboody@controlgroup.com") == 0
      request_email = "brian.forster@controlgroup.com"
    end
    @time_sheets = TimeSheets.fromSevenDaysAgo request_email
    erb :index
  end
end

get '/logout' do
  token = session.delete("access_token")
  session.delete("refresh_token")
  session.delete("expires_in")
  session.delete("issued_at")
  response = Net::HTTP.get(URI.parse("https://accounts.google.com/o/oauth2/revoke?token=" + token))
  erb :logout
end

get "/submit" do
  first_name = params.delete("first_name")
  last_name = params.delete("last_name")
  email = params["email"]
  project_name = params["project_nm"]
  task_name = params["task_nm"]
  time_type = params["task_type_nm"]
  submission_time = params["date"]
  hours = params["hours"]
  @time_sheets = TimeSheets.new({first_name: first_name, last_name: last_name, project_name: project_name, task_name: task_name, time_type: time_type, email: email, submission_time: submission_time, hours: hours})
  if @time_sheets.save
    puts "SUCCESS"
  else
    "Sorry, there was an error!"
  end
end

get "/error" do
  erb :error
end

