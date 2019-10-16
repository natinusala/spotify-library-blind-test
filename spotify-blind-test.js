/* global $*/
/* global SpotifyWebApi */
/* global jQuery */
/* global StyleFix */
/* global location */

//PrefixFree jQuery addon
(function($, self){

if(!$ || !self) {
	return;
}

for(var i=0; i<self.properties.length; i++) {
	var property = self.properties[i],
		camelCased = StyleFix.camelCase(property),
		PrefixCamelCased = self.prefixProperty(property, true);

	$.cssProps[camelCased] = PrefixCamelCased;
}

})(window.jQuery, window.PrefixFree);

var s = new SpotifyWebApi();

var CLIENT_ID = "6beecd543ea04b7b9f5aba153c98151e";
var REDIRECT_URI = "https://natinusala.github.io/spotify-library-blind-test/callback.html";
var SCORE_CAP = 75;

function getLoginURL(scopes) {
			return 'https://accounts.spotify.com/authorize?client_id=' + CLIENT_ID
				+ '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
				+ '&scope=' + encodeURIComponent(scopes.join(' '))
				+ '&response_type=token';
		}

function openLogin()
{
    var url = getLoginURL([
					'user-library-read',
	]);

	var width = 450,
			height = 730,
			left = (screen.width / 2) - (width / 2),
			top = (screen.height / 2) - (height / 2);

	var w = window.open(url,
			'Spotify',
			'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
	);
}

var total = 0;
var limit = -1;
var loaded = 0;
var songs = [];
var song;
var audio;
var totalSongs = 0;
var totalScore = 0;

function setLoadingProgress(progress)
{
    $("#loadingProgress").text( progress + "/" + total);
    $("#loadingBar").css("width", (progress/total) * 100 + "%");
}

function loadSongs()
{
    //Get the total
    s.getMySavedTracks({
            limit: 1,
            offset: 0,
        },
        function(error, data)
        {
            total = data.total;

            if (limit != -1 && total > limit)
                total = limit;

            setLoadingProgress(0);

            //Run the 1st iteration
            loadSongsIteration();
        }
    );
}

function shuffle(array) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

function getScore(guessed, original)
{
    guessed = guessed.toLowerCase();
    original = original.toLowerCase();

    var score = original.length - getEditDistance(guessed, original);
    return score / original.length * 100;
}

function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) == a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
};

$(document).ready(function(){
    $("#songGuess").keydown(function(event){
        if(event.keyCode == 13)
        {
            guess();
        }
        else if (event.keyCode == 9)
        {
            event.preventDefault();
            $("#artistGuess").focus();
        }
    });

    $("#artistGuess").keydown(function(event){
        if(event.keyCode == 13)
        {
            guess();
        }
        else if (event.keyCode == 9)
        {
            event.preventDefault();
            $("#songGuess").focus();
        }
    });

    jQuery.fn.shake = function(intShakes, intDistance, intDuration) {
        this.each(function() {
            $(this).css("position","relative");
            for (var x=1; x<=intShakes; x++) {
            $(this).animate({left:(intDistance*-1)}, (((intDuration/intShakes)/4)))
        .animate({left:intDistance}, ((intDuration/intShakes)/2))
        .animate({left:0}, (((intDuration/intShakes)/4)));
        }
      });
    return this;
    };

    $("#login").show();
    $("#login").css("transform", "translate(-50%, -50%)");
});

function guess()
{
    var reduceSongName = function (songName) {
        if (songName.lastIndexOf(' - ') != -1)
            songName = songName.substr(0, songName.lastIndexOf(' - ')-1);

        songName = songName.replace(/ *\([^)]*\) */g, "").trim();

        return songName;
    }

    var guessedSongName = reduceSongName($("#songGuess").val());
    var songNameToCompareTo = reduceSongName(song.track.name);

    console.log(songNameToCompareTo);

    var guessedArtistName = $("#artistGuess").val();

    var songDisabled = $("#songGuess").prop("disabled");
    var artistDisabled = $("#artistGuess").prop("disabled");

    if (guessedSongName !== "" && !songDisabled)
    {
        var score = getScore(guessedSongName, songNameToCompareTo);
        if (score >= SCORE_CAP)
        {
            $("#songGuess").val(song.track.name);
            $("#songGuess").prop("disabled", true);
            $("#formGroupSong").addClass("has-success");
        }
        else
        {
            $("#formGroupSong").addClass("has-error");
            $("#songGuess").val("");
            $("#songGuess").shake(2, 10, 200);
        }
    }

    if (guessedArtistName !== "" && !artistDisabled)
    {
        var score = getScore(guessedArtistName, song.track.album.artists[0].name);
        if (score >= SCORE_CAP)
        {
            $("#artistGuess").val(createArtistsString(song));
            $("#artistGuess").prop("disabled", true);
            $("#formGroupArtist").addClass("has-success");
        }
        else
        {
            $("#formGroupArtist").addClass("has-error");
            $("#artistGuess").val("");
            $("#artistGuess").shake(2, 10, 200);
        }
    }

    songDisabled = $("#songGuess").prop("disabled");
    artistDisabled = $("#artistGuess").prop("disabled");

    if (songDisabled && artistDisabled)
    {
        result();
    }
}

function logout()
{
    location.reload();
}

function createArtistsString(song)
{
    var string = song.track.artists[0].name + ", ";

    for (var i = 1; i < song.track.artists.length-1; i++)
    {
        string += song.track.artists[i].name + ", ";
    }

    string = string.substr(0, string.length-2);

    return string;
}

function getCoverForSong(song)
{
    var arr = song.track.album.images;
    return arr[arr.length - 1].url;
}

function result()
{
    audio.pause();

    $("#songName").text(song.track.name);
    $("#artistName").text(createArtistsString(song));

    $("#albumCover").attr("src", getCoverForSong(song));

    var songDisabled = $("#songGuess").prop("disabled");
    var artistDisabled = $("#artistGuess").prop("disabled");

    if (songDisabled && artistDisabled)
    {
        $("#resultText").text("Congratulations ! You found the song and the artist name !");
        totalScore += 1;
    }
    else if (songDisabled && !artistDisabled)
    {
        $("#resultText").text("Not bad ! You found the song !");
        totalScore += 0.5;
    }
    else if (!songDisabled && artistDisabled)
    {
        $("#resultText").text("Not bad ! You found the artist !");
        totalScore += 0.5;
    }
    else if (!songDisabled && !artistDisabled)
    {
        $("#resultText").text("Oops, you didn't find anything");
    }

    totalSongs++;

    $("#successRate").text(totalScore + " points earned out of a total of " + totalSongs + " tracks");

    $("#result").show();

    $("#game").css("transform", "translate(-150%,-50%)");
    $("#result").css("transform", "translate(-50%,-50%)");

    setTimeout(function(){
        $("#game").hide();
    }, 1000);
}

function nextSong()
{
    startGameForNewSong();
    $("#game").show();

    $("#result").css("transform", "translate(50%,-50%)");
    $("#game").css("transform", "translate(-50%,-50%)");

    setTimeout(function(){
        $("#result").hide();
    }, 1000);
}

function ready()
{
    startGameForNewSong();

    $("#game").show();

    $("#ready").css("transform", "translate(-150%,-50%)");
    $("#game").css("transform", "translate(-50%,-50%)");

    setTimeout(function(){
        $("#ready").hide();
    }, 1000);
}

function startGameForNewSong()
{
    $("#songGuess").prop("disabled", false);
    $("#artistGuess").prop("disabled", false);

    $("#formGroupArtist").removeClass("has-success");
    $("#formGroupSong").removeClass("has-success");

    $("#formGroupSong").removeClass("has-error");
    $("#formGroupArtist").removeClass("has-error");

    $("#songGuess").val("");
    $("#artistGuess").val("");

    //Pick a random song
    var randIndex = Math.floor(Math.random()*songs.length);
    song = songs[randIndex];

    //Play it
    audio = new Audio(song.track.preview_url);
    audio.volume = 0.05;
    audio.onended = result;
    $("#time").text("30");
    audio.ontimeupdate = function()
    {
        $("#time").text(Math.floor(audio.duration) - Math.floor(audio.currentTime));
    }
    audio.play().catch(err => {
        console.error(err);
        songs.splice(randIndex, 1); // We remove this element since it cannot be read.
        startGameForNewSong(); // We rerun the game for a song which works.
    });
}

function loadSongsIteration()
{
     s.getMySavedTracks({
            limit: 50,
            offset: loaded,
        },
        function(error, data)
        {
            var filteredData = data.items.filter(({track}) => !!track.preview_url);
            songs = songs.concat(filteredData);
            loaded += data.items.length;
            setLoadingProgress(loaded);

            if (loaded < total)
            {
                //Continue loading
                loadSongsIteration();
            }
            else
            {
                //Start the game
                songs = shuffle(songs);

                $("#ready").show();

                $("#loading").css("transform", "translate(-150%,-50%)");
                $("#ready").css("transform", "translate(-50%,-50%)");

                setTimeout(function(){
                    $("#loading").hide();
                }, 1000);
            }
        }
    );
}

window.onmessage = function (e) {
  var data = JSON.parse(e.data);
  if (data.type == "access_token")
  {
      s.setAccessToken(data.access_token);

      $("#loading").show();

      $("#login").css("transform", "translate(-150%,-50%)");
      $("#loading").css("transform", "translate(-50%,-50%)");

      setTimeout(function(){
          $("#login").hide();
      }, 1000);

      setTimeout(loadSongs, 1000);
  }
};
