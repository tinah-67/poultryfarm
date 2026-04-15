package com.poultryapp

import android.content.ClipData
import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class ReportShareModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ReportShareModule"

  @ReactMethod
  fun shareFile(path: String, title: String, mimeType: String, promise: Promise) {
    try {
      val file = File(path)

      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File does not exist at path: $path")
        return
      }

      val contentUri = FileProvider.getUriForFile(
        reactContext,
        "${reactContext.packageName}.fileprovider",
        file
      )

      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_STREAM, contentUri)
        clipData = ClipData.newUri(reactContext.contentResolver, file.name, contentUri)
        setDataAndType(contentUri, mimeType)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      val chooserIntent = Intent.createChooser(shareIntent, title).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      reactContext.startActivity(chooserIntent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("SHARE_FAILED", error)
    }
  }
}
