/*!
 * mongoskin - test/collection.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var mongoskin = require('../');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var Collection = mongodb.Collection;
var SkinCollection = mongoskin.SkinCollection;
var Cursor = mongodb.Cursor;
var should = require('should');
var servermanager = require('./utils/server_manager');


exports.testWithDb = function(db) {

  describe('collection.js', function () {

      var testcollection, commentcollection;
      before(function (done) {
        testcollection = db.collection('test_collection');
        commentcollection = db.collection('comment');

        testcollection.ensureIndex({title: -1}, function (err, index) {
          should.not.exist(err);
          index.should.equal('title_-1');
          testcollection.findItems(function (err, rows) {
            should.not.exist(err);
            rows.should.be.instanceof(Array).with.length(0);
            done();
          });
        });
      });

      after(function (done) {
        testcollection.drop(function (err, result) {
          should.ok(result);
          done(err);
        });
      });

      it('should retrive native cursor', function(done) {
          db.collection('test_collection').find(function(err, cursor) {
              should.not.exists(err);
              cursor.toArray.should.be.instanceof(Function);
              should.not.exists(cursor.open);
              done();
          });
      })

      describe('find(), findItems(), findEach()', function () {
        var objectIds = [], stringIds = [];
        before(function (done) {
          var inserts = [];
          for (var i = 0; i < 100; i++) {
            inserts.push({
              text: 'this is comment ' + i,
              createtime: new Date()
            });
          }
          commentcollection.insert(inserts, function (err, docs) {
            if (err) {
              return done(err);
            }
            for (var i = 0, l = docs.length; i < l; i++) {
              var doc = docs[i];
              stringIds.push(doc._id.toString());
              objectIds.push(doc._id);
            }
            done();
          });
        });
        after(function (done) {
          commentcollection.drop(done);
        });

        it('should find().toArray() return 100 comments', function (done) {
          commentcollection.find().toArray(function (err, rows) {
            should.not.exist(err);
            rows.should.be.instanceof(Array).with.length(100);
            done();
          });
        });

        it('should findItems(fn) all comments', function (done) {
          commentcollection.findItems(function (err, comments) {
            should.not.exist(err);
            should.exist(comments);
            comments.should.be.instanceof(Array).with.length(100);
            done();
          });
        });

        it('should findItems({} fn) all comments', function (done) {
          commentcollection.findItems(function (err, comments) {
            should.not.exist(err);
            should.exist(comments);
            comments.should.be.instanceof(Array).with.length(100);
            done();
          });
        });

        it('should findItems({limit: 10}) query wrong return top 0 comments', function (done) {
          commentcollection.findItems({limit: 10}, function (err, comments) {
            should.not.exist(err);
            comments.should.be.instanceof(Array).with.length(0);
            done();
          });
        });

        it('should findItems({}, {limit: 10}) return top 10 comments', function (done) {
          commentcollection.findItems({}, {limit: 10}, function (err, comments) {
            should.not.exist(err);
            comments.should.be.instanceof(Array).with.length(10);
            done();
          });
        });

        it('should findEach(fn) call fn 100 times', function (done) {
          var count = 0;
          commentcollection.findEach(function (err, comment) {
            should.not.exist(err);
            if (!comment) {
              count.should.equal(100);
              return done();
            }
            count++;
          });
        });

        it('should findEach({}, {limit: 20}, fn) call fn 20 times', function (done) {
          var count = 0;
          commentcollection.findEach({}, {limit: 20}, function (err, comment) {
            should.not.exist(err);
            if (!comment) {
              count.should.equal(20);
              return done();
            }
            count++;
          });
        });

        describe('mock find() error', function () {
          var _find;
          before(function () {
            _find = commentcollection.find;
            commentcollection.find = function () {
              var callback = arguments[arguments.length - 1];
              process.nextTick(function () {
                callback(new Error('mock find() error'));
              });
            };
          });
          after(function () {
            if (_find) {
              commentcollection.find = _find;
            }
          });

          it('should findItems() error', function (done) {
            commentcollection.findItems(function (err, docs) {
              should.exist(err);
              err.should.be.instanceof(Error).with.have.property('message', 'mock find() error');
              should.not.exist(docs);
              done();
            });
          });
          it('should findEach() error', function (done) {
            commentcollection.findEach(function (err, docs) {
              should.exist(err);
              err.should.be.instanceof(Error).with.have.property('message', 'mock find() error');
              should.not.exist(docs);
              done();
            });
          });
        });

      });

      describe('findById(), updateById(), removeById()', function () {
        var now = new Date();
        var articleId;
        before(function (done) {
          db.bind('article');
          var doc = { title: 'test article title ' + now, created_at: now };
          db.article.insert(doc, function (err, res) {
            articleId = res.insertedIds[0];
            done(err);
          });
        });
        after(function (done) {
          db.article.drop(done);
        });

        it('should bind functions', function(done) {
            db.article.bind({
                get: function(id, callback) {
                  this.findById(id, callback);
                }
            });
            db.article.get(articleId, done)
        });

        describe('findById()', function () {
          it('should find one object by ObjectID', function (done) {
            db.article.findById(articleId, function (err, article) {
              should.not.exist(err);
              should.exist(article);
              article.should.have.property('_id').with.instanceof(ObjectID);
              article.should.have.property('created_at').with.instanceof(Date);
              article.should.have.property('title').with.include(now.toString());
              article.created_at.toString().should.equal(now.toString());
              done();
            });
          });
          it('should find one object by String id', function (done) {
            db.article.findById(articleId.toString(), function (err, article) {
              should.not.exist(err);
              should.exist(article);
              article.should.have.property('_id').with.instanceof(ObjectID);
              article.should.have.property('created_at').with.instanceof(Date);
              article.should.have.property('title').with.include(now.toString());
              article.created_at.toString().should.equal(now.toString());
              done();
            });
          });
          it('should not find when id not exists', function (done) {
            db.article.findById('foo', function (err, article) {
              should.not.exist(err);
              should.not.exist(article);
              done();
            });
          });
        });

        describe('updateById()', function () {
          it('should update obj by id', function (done) {
            var updatedTime = new Date();
            var doc = {
              $set: {
                title: 'new title ' + updatedTime,
                updated_at: updatedTime
              }
            };
            db.article.updateById(articleId.toString(), doc, function (err, result) {
              should.not.exist(err);
              result.should.have.property('ok', 1);
              db.article.findById(articleId, function (err, article) {
                should.not.exist(err);
                should.exist(article);
                article.should.have.property('title', 'new title ' + updatedTime);
                article.should.have.property('updated_at').with.instanceof(Date);
                article.updated_at.toString().should.equal(updatedTime.toString());
                done();
              });
            });
          });

          it('with no callback', function(done) {
            var updatedTime = new Date();
            var doc = {
              $set: {
                title: 'new title ' + updatedTime,
                updated_at: updatedTime
              }
            };
            db.article.updateById(articleId.toString(), doc);

            setTimeout(function() {
              done();
            }, 0);
          });
        });

        describe('removeById()', function () {
          it('should remove obj by id', function (done) {
            var id = articleId.toString();
            db.article.findById(id, function (err, article) {
              should.not.exist(err);
              should.exist(article);
              db.article.removeById(id, function (err, success) {
                should.not.exist(err);
                success.should.equal(1);
                db.article.findById(id, function (err, article) {
                  should.not.exist(err);
                  should.not.exist(article);
                  done();
                });
              });
            });
          });

          it('should remove not exists obj', function (done) {
            var id = articleId.toString();
            db.article.removeById(id, function (err, res) {
              should.not.exist(err);
              res.should.equal(0);
              done();
            });
          });

          it('no callback', function(done) {
            var id = articleId.toString();
            db.article.removeById(id);
            setTimeout(function() {
              done();
            }, 0);
          });
        });

      });
  });
}
