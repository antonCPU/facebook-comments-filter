var Feed = function() {
  var that = this;

  this.contentList = {};

  setInterval(function() {
    that.parseNew();
  }, 1000);

  this.parseNew();
};

Feed.prototype.parseNew = function() {
  var that = this;

  $('.userContentWrapper').each(function() {
    var $el = $(this),
        data = $el.parent().data('ft'),
        id  = data ? data.mf_story_key : null;

    if (id && !that.contentList[id]) {
      that.contentList[id] = new Content(id, $el);
    }
  });
};

var Content = function(id, $el) {
  var that = this;

  this.id  = id;
  this.$el = $el;
  this.mode = 'all';

  this.ownerName = this.detectOwnerName();

  if (!this.ownerName) {
    return this;
  }

  this.$link = $('<div class="show-comments" style="float:right;">'
                   + '<a href="#" class="show-author-comments">View ' + this.ownerName + ' Comments</a>'
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

Content.prototype.detectOwnerName = function() {
  return this.$el.find('a[data-hovercard]:not([aria-hidden]):eq(0)').html();
};

Content.prototype.toggleMode = function() {
  if (this.mode === 'all') {
    this.showOwnerComments();
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
      this.showOwnerComments();
    }
};

Content.prototype.showOwnerComments = function() {
  var name = this.ownerName,
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
  var pager = this.$el.find('.UFIPagerLink')[0];

  if (pager) {
    pager.click();
  }
};

// initialize
var feed = new Feed();

console.log(feed);