var Feed = function() {
  this.contentList = {};
};

Feed.prototype.parseNew = function() {
  var that = this;

  $('.userContentWrapper').each(function() {
    var $el = $(this),
        data = $el.parent().data('ft'),
        id  = data ? data.mf_story_key : null;

    if (id && !that.contentList[id] && Content.isSuitable($el)) {
      that.contentList[id] = new Content(id, $el);
      //$el.css('border', '2px solid red');
    }
  });
};

var Content = function(id, $el) {
  var that = this;

  this.id  = id;
  this.$el = $el;
  this.mode = 'all';

  this.authorName = $el.find('.profileLink').html();

  this.$link = $('<div class="show-comments" style="float:right;">'
                   + '<a href="#" class="show-author-comments">View Author Comments</a>'
                   + '<a href="#" class="show-all-comments" style="display:none;">View All Comments</a>'
               + '</div>');

  $el.find('.UFILikeSentenceText').append(this.$link);

  this.$link.on('click', function() {
    that.toggleMode();
  });

  setInterval(function() {
    that.updateMode();
  }, 100);
};

Content.isSuitable = function($el) {
  var $profileLink = $el.find('.profileLink');
  if (!$profileLink.length) {
    return false;
  }

  var name = $profileLink.text();

  return $profileLink.closest('.fcg').text().replace(name, '').match(/commented/g);
};

Content.prototype.toggleMode = function() {
  if (this.mode === 'all') {
    this.showAuthorComments();
    this.mode = 'author';
    this.$link.find('.show-author-comments').hide();
    this.$link.find('.show-all-comments').show();
  } else {
    this.showAllComments();
    this.mode = 'all';
    this.$link.find('.show-author-comments').show();
    this.$link.find('.show-all-comments').hide();
  }
};

Content.prototype.updateMode = function() {
    if (this.mode === 'author') {
      this.showAuthorComments();
    }
};

Content.prototype.showAuthorComments = function() {
  var name = this.authorName,
      count = 0;

  this.$el.find('.UFIComment').each(function() {
    var $comment = $(this);

    if (name !== $comment.find('.UFICommentActorName').html()) {
      $comment.hide();
    } else {
      count++;
    }
  });

  if (!count) {
    this.fetchComments();
  }
};

Content.prototype.showAllComments = function() {
  this.$el.find('.UFIComment').show();
};

Content.prototype.fetchComments = function() {
  this.$el.find('.UFIPagerLink')[0].click();
};

// initialize
var feed = new Feed();
feed.parseNew();

setInterval(function() {
  feed.parseNew();
}, 1000);

console.log(feed);